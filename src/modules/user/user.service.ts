import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AppConfigService } from 'src/config/app-config.service';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/modules/user/dto/update-user.dto';
import { UserRepository } from 'src/modules/user/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigService,
  ) {}

  async create(tenantId: string, dto: CreateUserDto, actor?: JwtUser) {
    const existingUser = await this.userRepository.findByEmail(tenantId, dto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    if (dto.roleIds && dto.roleIds.length > 0 && actor && !actor.roles.includes('admin')) {
      throw new ForbiddenException('Only tenant admins can assign roles');
    }

    const provisionedPassword = dto.password ?? this.resolveProvisionedPassword();
    const passwordHash = await argon2.hash(provisionedPassword);
    const nextStatus = dto.status ?? UserStatus.ACTIVE;
    const selectedRoleIds =
      dto.roleIds && dto.roleIds.length > 0
        ? dto.roleIds
        : await this.resolveDefaultRoleIds(tenantId);

    await this.assertRoleIdsBelongToTenant(tenantId, selectedRoleIds);

    const deletedUserWithSameEmail = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
        userPageAccesses: {
          include: {
            page: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    const user = deletedUserWithSameEmail && (deletedUserWithSameEmail.isDeleted || deletedUserWithSameEmail.status === UserStatus.DELETED)
      ? await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.user.update({
            where: { id: deletedUserWithSameEmail.id },
            data: {
              email: dto.email,
              firstName: dto.firstName,
              lastName: dto.lastName,
              passwordHash,
              status: nextStatus,
              isDeleted: false,
              deletedAt: null,
            },
          });

          await tx.userRole.deleteMany({ where: { userId: deletedUserWithSameEmail.id } });

          if (selectedRoleIds.length > 0) {
            await tx.userRole.createMany({
              data: selectedRoleIds.map((roleId) => ({
                userId: deletedUserWithSameEmail.id,
                roleId,
              })),
            });
          }

          return tx.user.findFirstOrThrow({
            where: { id: deletedUserWithSameEmail.id },
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      permissions: true,
                    },
                  },
                },
              },
              userPageAccesses: {
                include: {
                  page: {
                    include: {
                      module: true,
                    },
                  },
                },
              },
            },
          });
        })
      : await this.userRepository.create({
          tenant: { connect: { id: tenantId } },
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          status: nextStatus,
          userRoles: {
            create: selectedRoleIds.map((roleId) => ({
              role: { connect: { id: roleId } },
            })),
          },
        });

    if (actor && selectedRoleIds.length > 0) {
      await this.prisma.accessAuditLog.create({
        data: {
          tenantId,
          actorUserId: actor.sub,
          targetUserId: user.id,
          eventType: 'user.roles.assigned',
          entityType: 'user-role-assignment',
          entityId: user.id,
          summary: `Assigned initial roles to ${user.email}`,
          metadata: {
            roleIds: selectedRoleIds,
          },
        },
      });
    }

    return {
      ...this.mapUser(user),
      ...(dto.password ? {} : { temporaryPassword: provisionedPassword }),
    };
  }

  async findAll(tenantId: string) {
    const users = await this.userRepository.findManyByTenant(tenantId);
    return users.map((user) => this.mapUser(user));
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.userRepository.findById(tenantId, id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUser(user);
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, actor?: JwtUser) {
    const existingUser = await this.userRepository.findById(tenantId, id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.roleIds && (!actor || !actor.roles.includes('admin'))) {
      throw new ForbiddenException('Only tenant admins can change role assignments');
    }

    if (dto.email && dto.email !== existingUser.email) {
      const duplicate = await this.userRepository.findByEmail(tenantId, dto.email);
      if (duplicate) {
        throw new ConflictException('Email already in use');
      }
    }

    const passwordHash = dto.password ? await argon2.hash(dto.password) : undefined;

    if (dto.roleIds) {
      await this.assertRoleIdsBelongToTenant(tenantId, dto.roleIds);
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: dto.status,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      if (dto.roleIds) {
        const previousRoleIds = existingUser.userRoles.map((userRole) => userRole.role.id).sort();
        const nextRoleIds = [...new Set(dto.roleIds)].sort();

        await tx.userRole.deleteMany({ where: { userId: existingUser.id } });

        if (nextRoleIds.length > 0) {
          await tx.userRole.createMany({
            data: nextRoleIds.map((roleId) => ({
              userId: existingUser.id,
              roleId,
            })),
          });
        }

        if (actor) {
          await tx.accessAuditLog.create({
            data: {
              tenantId,
              actorUserId: actor.sub,
              targetUserId: existingUser.id,
              eventType: 'user.roles.updated',
              entityType: 'user-role-assignment',
              entityId: existingUser.id,
              summary: `Updated roles for ${existingUser.email}`,
              metadata: {
                previousRoleIds,
                nextRoleIds,
              },
            },
          });
        }
      }
    });

    return this.findOne(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    const existingUser = await this.userRepository.findById(tenantId, id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    return { success: true };
  }

  mapUser(user: {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    userRoles: Array<{
      role: {
        id?: string;
        name: string;
        permissions: Array<{ action: string; resource: string }>;
      };
    }>;
    userPageAccesses?: Array<{
      canRead: boolean;
      canWrite: boolean;
      page: {
        key: string;
        module: {
          key: string;
        };
      };
    }>;
  }) {
    const rolePermissions = new Set(
      user.userRoles.flatMap((userRole) =>
        userRole.role.permissions.map((permission) => `${permission.action}:${permission.resource}`),
      ),
    );

    const overrideResources = new Set(
      (user.userPageAccesses ?? []).map(
        (userPageAccess) => `${userPageAccess.page.module.key}.${userPageAccess.page.key}`,
      ),
    );

    const effectivePermissions = [...rolePermissions].filter((permissionKey) => {
      const delimiterIndex = permissionKey.indexOf(':');
      const resource = delimiterIndex >= 0 ? permissionKey.slice(delimiterIndex + 1) : permissionKey;
      return !overrideResources.has(resource);
    });

    for (const userPageAccess of user.userPageAccesses ?? []) {
      const resource = `${userPageAccess.page.module.key}.${userPageAccess.page.key}`;
      if (userPageAccess.canRead) {
        effectivePermissions.push(`read:${resource}`);
      }
      if (userPageAccess.canWrite) {
        effectivePermissions.push(`write:${resource}`);
      }
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.userRoles.map((userRole) => userRole.role.name),
      roleIds: user.userRoles.flatMap((userRole) => (userRole.role.id ? [userRole.role.id] : [])),
      permissions: [...new Set(effectivePermissions)],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async resolveDefaultRoleIds(tenantId: string) {
    const hasActiveAdmin = await this.userRepository.hasActiveAdminByTenant(tenantId);

    const roleName = hasActiveAdmin ? 'member' : 'admin';
    const role = await this.prisma.role.findFirst({
      where: {
        tenantId,
        name: roleName,
      },
    });

    return role ? [role.id] : [];
  }

  private resolveProvisionedPassword() {
    const passwordMode = this.configService.userProvisioningPasswordMode;

    if (passwordMode === 'static') {
      const staticPassword = this.configService.userProvisioningStaticPassword;
      if (!staticPassword || staticPassword.length < 8) {
        throw new BadRequestException(
          'USER_PROVISIONING_STATIC_PASSWORD must be set to at least 8 characters when password mode is static',
        );
      }

      return staticPassword;
    }

    if (passwordMode !== 'random') {
      throw new BadRequestException(
        `Unsupported USER_PROVISIONING_PASSWORD_MODE: ${passwordMode}. Use "random" or "static".`,
      );
    }

    const randomLength = Math.max(this.configService.userProvisioningRandomPasswordLength, 8);
    return this.generateRandomPassword(randomLength);
  }

  private generateRandomPassword(length: number) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const bytes = randomBytes(length);
    let password = '';

    for (let index = 0; index < length; index += 1) {
      password += alphabet[bytes[index] % alphabet.length];
    }

    return password;
  }

  private async assertRoleIdsBelongToTenant(tenantId: string, roleIds: string[]) {
    if (roleIds.length === 0) {
      return;
    }

    const count = await this.prisma.role.count({
      where: {
        tenantId,
        id: {
          in: roleIds,
        },
      },
    });

    if (count !== roleIds.length) {
      throw new BadRequestException('One or more roles do not belong to the tenant');
    }
  }
}






