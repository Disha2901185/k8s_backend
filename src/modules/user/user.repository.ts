import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const userInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
    },
  },
  userPageAccesses: {
    include: {
      page: {
        include: {
          module: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: userInclude,
    });
  }

  findManyByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        isDeleted: false,
      },
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: {
        tenantId,
        id,
        isDeleted: false,
      },
      include: userInclude,
    });
  }

  findByEmail(tenantId: string, email: string) {
    return this.prisma.user.findFirst({
      where: {
        tenantId,
        email,
        isDeleted: false,
        status: {
          not: UserStatus.DELETED,
        },
      },
      include: userInclude,
    });
  }

  findByEmailGlobal(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
        status: {
          not: UserStatus.DELETED,
        },
      },
      include: userInclude,
    });
  }

  async hasActiveAdminByTenant(tenantId: string) {
    const count = await this.prisma.user.count({
      where: {
        tenantId,
        isDeleted: false,
        status: UserStatus.ACTIVE,
        userRoles: {
          some: {
            role: {
              name: 'admin',
            },
          },
        },
      },
    });

    return count > 0;
  }
}

