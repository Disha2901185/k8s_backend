import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  DEFAULT_MEMBER_PERMISSION_KEYS,
  toPermissionKey,
} from '../src/modules/access-control/access-catalog';
import {
  seedDefaultTenantPageAccess,
  seedGlobalAccessCatalog,
} from '../src/modules/access-control/access-catalog.seed';

const prisma = new PrismaClient();

async function main() {
  await seedGlobalAccessCatalog(prisma);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default-tenant' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default-tenant',
    },
  });

  await seedDefaultTenantPageAccess(prisma, tenant.id);

  const eligiblePermissions = await prisma.permission.findMany({
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

  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'admin',
      },
    },
    update: {
      permissions: {
        set: eligiblePermissions.map((permission) => ({ id: permission.id })),
      },
    },
    create: {
      tenantId: tenant.id,
      name: 'admin',
      description: 'Tenant administrator',
      permissions: {
        connect: eligiblePermissions.map((permission) => ({ id: permission.id })),
      },
    },
  });

  await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'member',
      },
    },
    update: {
      permissions: {
        set: eligiblePermissions
          .filter((permission) =>
            DEFAULT_MEMBER_PERMISSION_KEYS.includes(
              toPermissionKey(permission.action, permission.resource),
            ),
          )
          .map((permission) => ({ id: permission.id })),
      },
    },
    create: {
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

  const passwordHash = await argon2.hash('ChangeMe123!');

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@example.com',
      },
    },
    update: {
      passwordHash,
      firstName: 'ERP',
      lastName: 'Admin',
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@example.com',
      firstName: 'ERP',
      lastName: 'Admin',
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

