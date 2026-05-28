import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from 'src/config/app-config.service';
import { ConfigModule } from 'src/config/config.module';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { LoggingInterceptor } from 'src/common/interceptors/logging.interceptor';
import { RequestIdInterceptor } from 'src/common/interceptors/request-id.interceptor';
import { AssociatesModule } from 'src/modules/associates/associates.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CompaniesModule } from 'src/modules/companies/companies.module';
import { ContactsModule } from 'src/modules/contacts/contacts.module';
import { AccessControlModule } from 'src/modules/access-control/access-control.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { HealthModule } from 'src/modules/health/health.module';
import { LeadsModule } from 'src/modules/leads/leads.module';
import { DealsModule } from 'src/modules/deals/deals.module';
import { FilesModule } from 'src/modules/files/files.module';
import { FinanceOpsModule } from 'src/modules/finance-ops/finance-ops.module';
import { TenantModule } from 'src/modules/tenant/tenant.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => [
        {
          ttl: configService.throttleTtl,
          limit: configService.throttleLimit,
        },
      ],
    }),
    PrismaModule,
    AssociatesModule,
    HealthModule,
    TenantModule,
    AuthModule,
    UserModule,
    AccessControlModule,
    CompaniesModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    FilesModule,
    FinanceOpsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
