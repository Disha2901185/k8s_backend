import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_MEMBER_PERMISSION_KEYS,
  toPermissionKey,
} from 'src/modules/access-control/access-catalog';
import {
  seedDefaultTenantPageAccess,
  seedGlobalAccessCatalog,
} from 'src/modules/access-control/access-catalog.seed';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTenantDto } from 'src/modules/tenant/dto/create-tenant.dto';
import { UpdateTenantProfileDto } from 'src/modules/tenant/dto/update-tenant-profile.dto';
import { TenantRepository } from 'src/modules/tenant/tenant.repository';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const existingTenant = await this.tenantRepository.findBySlug(dto.slug);
    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await seedGlobalAccessCatalog(tx);

      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      await seedDefaultTenantPageAccess(tx, tenant.id);

      const eligiblePermissions = await tx.permission.findMany({
        where: {
          OR: [
            {
              pageId: null,
            },
            {
              page: {
                module: {
                  isSystem: true,
                },
              },
            },
            {
              page: {
                tenantPageAccesses: {
                  some: {
                    tenantId: tenant.id,
                    status: 'ACTIVE',
                  },
                },
              },
            },
          ],
        },
      });

      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'admin',
          description: 'Tenant administrator',
          permissions: {
            connect: eligiblePermissions.map((permission) => ({ id: permission.id })),
          },
        },
      });

      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'member',
          description: 'Standard tenant user',
          permissions: {
            connect: eligiblePermissions
              .filter((permission) =>
                DEFAULT_MEMBER_PERMISSION_KEYS.includes(
                  toPermissionKey(permission.action, permission.resource),
                ),
              )
              .map((permission) => ({ id: permission.id })),
          },
        },
      });

      return tenant;
    });
  }

  async getTenant(currentTenantId: string, requestedTenantId: string) {
    if (currentTenantId !== requestedTenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed');
    }

    const tenant = await this.tenantRepository.findById(requestedTenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateTenantProfile(currentTenantId: string, requestedTenantId: string, dto: UpdateTenantProfileDto) {
    if (currentTenantId !== requestedTenantId) {
      throw new ForbiddenException('Cross-tenant access is not allowed');
    }

    const tenant = await this.tenantRepository.findById(requestedTenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const clean = (value?: string) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    return this.tenantRepository.update(requestedTenantId, {
      legalName: clean(dto.legalName),
      logoUrl: clean(dto.logoUrl),
      billingStreet: clean(dto.billingStreet),
      billingCity: clean(dto.billingCity),
      billingState: clean(dto.billingState),
      billingStateCode: clean(dto.billingStateCode),
      billingCountry: clean(dto.billingCountry),
      billingZip: clean(dto.billingZip),
      taxId: clean(dto.taxId),
    });
  }
}


