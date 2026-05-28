import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
      },
    };
  }
}
