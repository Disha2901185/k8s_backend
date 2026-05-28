import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.getOrThrow<number>('app.port');
  }

  get swaggerPath(): string {
    return this.configService.getOrThrow<string>('app.swaggerPath');
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('database.url');
  }

  get redisUrl(): string {
    return this.configService.getOrThrow<string>('redis.url');
  }

  get accessSecret(): string {
    return this.configService.getOrThrow<string>('jwt.accessSecret');
  }

  get refreshSecret(): string {
    return this.configService.getOrThrow<string>('jwt.refreshSecret');
  }

  get accessTtl(): string {
    return this.configService.getOrThrow<string>('jwt.accessTtl');
  }

  get refreshTtl(): string {
    return this.configService.getOrThrow<string>('jwt.refreshTtl');
  }

  get leadApiEncryptionSecret(): string {
    return this.configService.getOrThrow<string>('leadApi.encryptionSecret');
  }

  get throttleTtl(): number {
    return this.configService.getOrThrow<number>('throttle.ttl');
  }

  get throttleLimit(): number {
    return this.configService.getOrThrow<number>('throttle.limit');
  }

  get userProvisioningPasswordMode(): string {
    return this.configService.getOrThrow<string>('userProvisioning.passwordMode');
  }

  get userProvisioningStaticPassword(): string {
    return this.configService.getOrThrow<string>('userProvisioning.staticPassword');
  }

  get userProvisioningRandomPasswordLength(): number {
    return this.configService.getOrThrow<number>('userProvisioning.randomPasswordLength');
  }
}
