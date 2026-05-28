import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from 'src/config/app-config.service';
import { REDIS_CLIENT } from 'src/redis/redis.constants';
import { RedisService } from 'src/redis/redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) =>
        new Redis(configService.redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
        }),
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
