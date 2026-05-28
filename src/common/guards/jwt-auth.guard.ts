import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/app-config.service';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { RequestWithUser } from 'src/modules/auth/interfaces/request-with-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && !Array.isArray(authHeader)) {
      const [scheme, credentials] = authHeader.split(' ');
      if (scheme === 'Bearer') {
        token = credentials;
      }
    }

    // fallback to cookie if header is not present
    if (!token && request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    let payload: JwtUser;
    try {
      payload = await this.jwtService.verifyAsync<JwtUser>(token, {
        secret: this.configService.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token type');
    }

    request.user = payload;
    return true;
  }
}
