import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { notifyProductionError } from 'src/common/utils/error-email.helper';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/redis/redis.constants';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleInit() {
    try {
      await this.redisClient.connect();
    } catch (error) {
      this.logger.warn(`Redis connection skipped: ${(error as Error).message}`);
      await notifyProductionError({
        functionName: 'RedisService.onModuleInit',
        error,
        context: {
          action: 'redis.connect',
        },
      });
    }
  }

  get client(): Redis {
    return this.redisClient;
  }

  async ping(): Promise<string> {
    return this.redisClient.ping();
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.redisClient.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }
}
