import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AppConfigService } from 'src/config/app-config.service';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthRepository } from 'src/modules/auth/auth.repository';
import { AuthService } from 'src/modules/auth/auth.service';
import { TenantModule } from 'src/modules/tenant/tenant.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.accessSecret,
      }),
    }),
    UserModule,
    TenantModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AuthModule {}
