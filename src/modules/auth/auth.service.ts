import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { notifyProductionError } from 'src/common/utils/error-email.helper';
import { AppConfigService } from 'src/config/app-config.service';
import { LeadApiCredentialDto } from 'src/modules/auth/dto/lead-api-credential.dto';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { RefreshDto } from 'src/modules/auth/dto/refresh.dto';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { AuthRepository } from 'src/modules/auth/auth.repository';
import { ttlToSeconds } from 'src/modules/auth/utils/token.util';
import { TenantRepository } from 'src/modules/tenant/tenant.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly tenantRepository: TenantRepository,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const tenant = await this.tenantRepository.findById(dto.tenantId);
      if (!tenant || !tenant.isActive) {
        throw new UnauthorizedException('Tenant does not exist');
      }

      const existingUser = await this.userRepository.findByEmail(dto.tenantId, dto.email);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      const hasActiveAdmin = await this.userRepository.hasActiveAdminByTenant(dto.tenantId);
      if (hasActiveAdmin) {
        throw new ForbiddenException('Public registration is only allowed when the tenant has no active admin');
      }

      const user = await this.userService.create(dto.tenantId, {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: dto.password,
      });

      return this.issueTokens(user, {}, tenant.slug);
    } catch (error) {
      await notifyProductionError({
        functionName: 'AuthService.register',
        error,
        context: {
          tenantId: dto.tenantId,
          email: dto.email,
        },
      });

      throw error;
    }
  }

  async login(dto: LoginDto, metadata: { ipAddress?: string; userAgent?: string }) {
    try {
      const user = await this.userRepository.findByEmailGlobal(dto.email);
      if (!user) {
        console.error(`Login failed: User with email ${dto.email} not found globally`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.status !== UserStatus.ACTIVE) {
        console.error(`Login failed: User ${dto.email} is not ACTIVE (status: ${user.status})`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const tenant = await this.tenantRepository.findById(user.tenantId);
      if (!tenant || !tenant.isActive) {
        console.error(`Login failed: Tenant ${user.tenantId} for user ${dto.email} not found or inactive`);
        throw new UnauthorizedException('Invalid tenant');
      }

      const validPassword = await argon2.verify(user.passwordHash, dto.password);
      if (!validPassword) {
        console.error(`Login failed: Password mismatch for user ${dto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const mappedUser = this.userService.mapUser(user);
      return this.issueTokens(mappedUser, metadata, tenant.slug);
    } catch (error) {
      // Don't log UnauthorizedException to simplify logs, as it's expected for some flows
      if (!(error instanceof UnauthorizedException)) {
        await notifyProductionError({
          functionName: 'AuthService.login',
          error,
          context: {
            email: dto.email,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
        });
      }

      throw error;
    }
  }

  async refresh(refreshToken: string, metadata: { ipAddress?: string; userAgent?: string }) {
    try {
      let payload: JwtUser;
      try {
        payload = await this.jwtService.verifyAsync<JwtUser>(refreshToken, {
          secret: this.configService.refreshSecret,
        });
      } catch {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      const session = await this.authRepository.findSessionById(payload.sessionId);
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Session is invalid');
      }

      const matches = await argon2.verify(session.refreshTokenHash, refreshToken);
      if (!matches) {
        await this.authRepository.revokeSession(session.id);
        throw new UnauthorizedException('Refresh token has been rotated');
      }

      await this.authRepository.revokeSession(session.id);

      const user = await this.userRepository.findById(payload.tenantId, payload.sub);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User not found');
      }

      const tenant = await this.tenantRepository.findById(user.tenantId);
      if (!tenant || !tenant.isActive) {
        throw new UnauthorizedException('Tenant not found');
      }

      return this.issueTokens(this.userService.mapUser(user), metadata, tenant.slug);
    } catch (error) {
      await notifyProductionError({
        functionName: 'AuthService.refresh',
        error,
        context: {
          refreshTokenPreview: refreshToken.slice(0, 12),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });

      throw error;
    }
  }

  async logout(user: JwtUser) {
    try {
      await this.authRepository.revokeSession(user.sessionId);
      return { success: true };
    } catch (error) {
      await notifyProductionError({
        functionName: 'AuthService.logout',
        error,
        context: {
          userId: user.sub,
          tenantId: user.tenantId,
          sessionId: user.sessionId,
          email: user.email,
        },
      });

      throw error;
    }
  }

  async getMe(user: JwtUser) {
    const dbUser = await this.userRepository.findById(user.tenantId, user.sub);
    if (!dbUser || dbUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.userService.mapUser(dbUser);
  }

  async getLeadApiCredential(user: JwtUser) {
    if (!user.roles.includes('admin')) {
      throw new ForbiddenException('Only tenant admins can access lead API credentials');
    }

    const leadApiCredential = await this.ensureLeadApiCredential(user);
    if (!leadApiCredential) {
      throw new UnauthorizedException('Lead API credential is unavailable');
    }

    return leadApiCredential;
  }

  async validateSession(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(token, {
        secret: this.configService.accessSecret,
      });

      if (payload.type !== 'access') {
        return null;
      }

      const dbUser = await this.userRepository.findById(payload.tenantId, payload.sub);
      if (!dbUser || dbUser.status !== UserStatus.ACTIVE) {
        return null;
      }

      return this.userService.mapUser(dbUser);
    } catch {
      return null;
    }
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      tenantId: string;
      roles: string[];
      roleIds: string[];
      permissions: string[];
      firstName: string;
      lastName: string;
      status: UserStatus;
      createdAt: Date;
      updatedAt: Date;
    },
    metadata: { ipAddress?: string; userAgent?: string },
    tenantSlug: string,
  ) {
    const sessionId = randomUUID();
    const refreshJti = randomUUID();
    const accessJti = randomUUID();

    const refreshPayload: JwtUser = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      sessionId,
      jti: refreshJti,
      roles: user.roles,
      permissions: user.permissions,
      type: 'refresh',
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.refreshSecret,
      expiresIn: this.configService.refreshTtl,
    });

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.authRepository.createSession({
      id: sessionId,
      tenant: { connect: { id: user.tenantId } },
      user: { connect: { id: user.id } },
      refreshTokenHash,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      expiresAt: new Date(Date.now() + ttlToSeconds(this.configService.refreshTtl) * 1000),
    });

    const accessToken = await this.jwtService.signAsync(
      {
        ...refreshPayload,
        jti: accessJti,
        type: 'access',
      },
      {
        secret: this.configService.accessSecret,
        expiresIn: this.configService.accessTtl,
      },
    );

    const leadApiCredential = await this.ensureLeadApiCredential(user);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.configService.accessTtl,
      refreshTokenExpiresIn: this.configService.refreshTtl,
      tenantSlug,
      user,
      ...(leadApiCredential ? { leadApiCredential } : {}),
    };
  }

  private async ensureLeadApiCredential(user: {
    tenantId: string;
    roles: string[];
  }): Promise<LeadApiCredentialDto | null> {
    if (!user.roles.includes('admin')) {
      return null;
    }

    const existing = await this.authRepository.findLeadApiCredentialByTenantId(user.tenantId);
    if (existing) {
      if (existing.clientSecretEncrypted) {
        return {
          clientId: existing.clientId,
          clientSecret: this.decryptLeadClientSecret(existing.clientSecretEncrypted),
          generatedNow: false,
        };
      }

      const rotatedSecret = this.generateLeadClientSecret();
      await this.authRepository.updateLeadApiCredential(user.tenantId, {
        clientSecretHash: await argon2.hash(rotatedSecret),
        clientSecretEncrypted: this.encryptLeadClientSecret(rotatedSecret),
      });

      return {
        clientId: existing.clientId,
        clientSecret: rotatedSecret,
        generatedNow: true,
      };
    }

    const clientId = `lead_${randomUUID().replace(/-/g, '')}`;
    const clientSecret = this.generateLeadClientSecret();
    const clientSecretHash = await argon2.hash(clientSecret);

    await this.authRepository.createLeadApiCredential({
      tenant: {
        connect: {
          id: user.tenantId,
        },
      },
      clientId,
      clientSecretHash,
      clientSecretEncrypted: this.encryptLeadClientSecret(clientSecret),
    });

    return {
      clientId,
      clientSecret,
      generatedNow: true,
    };
  }

  private generateLeadClientSecret() {
    return `sec_${randomBytes(32).toString('hex')}`;
  }

  private encryptLeadClientSecret(value: string) {
    const iv = randomBytes(12);
    const key = this.getLeadApiEncryptionKey();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decryptLeadClientSecret(payload: string) {
    const [ivPart, tagPart, encryptedPart] = payload.split(':');
    if (!ivPart || !tagPart || !encryptedPart) {
      throw new UnauthorizedException('Stored lead credential is invalid');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getLeadApiEncryptionKey(),
      Buffer.from(ivPart, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private getLeadApiEncryptionKey() {
    return createHash('sha256').update(this.configService.leadApiEncryptionSecret).digest();
  }
}
