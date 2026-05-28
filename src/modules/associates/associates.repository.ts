import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AssociatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listAssociates(where: Prisma.AssociateWhereInput, skip: number, take: number) {
    return this.prisma.associate.findMany({
      where,
      skip,
      take,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      include: {
        deals: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            company: true,
            sourceLead: true,
          },
        },
      },
    });
  }

  countAssociates(where: Prisma.AssociateWhereInput) {
    return this.prisma.associate.count({ where });
  }

  findAssociateById(tenantId: string, id: string) {
    return this.prisma.associate.findFirst({
      where: { tenantId, id },
      include: {
        deals: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            company: true,
            sourceLead: true,
          },
        },
      },
    });
  }

  findAssociateByNormalizedName(tenantId: string, normalizedName: string) {
    return this.prisma.associate.findFirst({
      where: { tenantId, normalizedName },
      include: {
        deals: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            company: true,
            sourceLead: true,
          },
        },
      },
    });
  }

  createAssociate(data: Prisma.AssociateCreateInput) {
    return this.prisma.associate.create({
      data,
      include: {
        deals: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            company: true,
            sourceLead: true,
          },
        },
      },
    });
  }

  updateAssociate(id: string, data: Prisma.AssociateUpdateInput) {
    return this.prisma.associate.update({
      where: { id },
      data,
      include: {
        deals: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            company: true,
            sourceLead: true,
          },
        },
      },
    });
  }

  deleteAssociate(id: string) {
    return this.prisma.associate.delete({
      where: { id },
    });
  }
}
