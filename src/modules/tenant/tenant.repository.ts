import { Injectable } from '@nestjs/common';
import { Prisma, Tenant } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TenantCreateInput): Promise<Tenant> {
    return this.prisma.tenant.create({ data });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  update(id: string, data: Prisma.TenantUpdateInput) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }
}
