import { AccessStatus, Prisma, PrismaClient } from '@prisma/client';
import {
  buildPageResource,
  DEFAULT_APP_CATALOG,
  DEFAULT_SYSTEM_PERMISSIONS,
  DEFAULT_TENANT_PAGE_KEYS,
} from './access-catalog';

type PrismaLike = Prisma.TransactionClient | PrismaClient;

const FINANCE_CLIENT_NESTED_PERMISSIONS = [
  {
    action: 'read',
    resource: 'finance-ops.clients.details',
    pageResource: 'finance-ops.clients',
    description: 'View client details and work orders under Clients',
  },
  {
    action: 'read',
    resource: 'finance-ops.clients.work-orders.details',
    pageResource: 'finance-ops.clients',
    description: 'View work order details through Clients workflow',
  },
  {
    action: 'write',
    resource: 'finance-ops.clients.work-orders.details',
    pageResource: 'finance-ops.clients',
    description: 'Edit and delete work orders through Clients workflow',
  },
  {
    action: 'write',
    resource: 'finance-ops.clients.work-orders.create',
    pageResource: 'finance-ops.clients',
    description: 'Create work orders from Client Details',
  },
  {
    action: 'read',
    resource: 'finance-ops.clients.work-orders.create',
    pageResource: 'finance-ops.clients',
    description: 'View work-order create capability from Client Details',
  },
  {
    action: 'read',
    resource: 'finance-ops.clients.work-orders.items',
    pageResource: 'finance-ops.clients',
    description: 'View Items tab under Work Order Details',
  },
  {
    action: 'write',
    resource: 'finance-ops.clients.work-orders.items',
    pageResource: 'finance-ops.clients',
    description: 'Create, edit, and delete item rows under Work Order Details',
  },
  {
    action: 'read',
    resource: 'finance-ops.clients.work-orders.schedules',
    pageResource: 'finance-ops.clients',
    description: 'View Schedule tab under Work Order Details',
  },
  {
    action: 'write',
    resource: 'finance-ops.clients.work-orders.schedules',
    pageResource: 'finance-ops.clients',
    description: 'Create, edit, and delete schedule rows under Work Order Details',
  },
  {
    action: 'read',
    resource: 'finance-ops.clients.work-orders.invoices',
    pageResource: 'finance-ops.clients',
    description: 'View Invoice tab under Work Order Details',
  },
  {
    action: 'write',
    resource: 'finance-ops.clients.work-orders.invoices',
    pageResource: 'finance-ops.clients',
    description: 'Create, edit, and delete invoices under Work Order Details',
  },
  {
    action: 'read',
    resource: 'finance-ops.clients.work-orders.receipts',
    pageResource: 'finance-ops.clients',
    description: 'View Receipt tab under Work Order Details',
  },
  {
    action: 'write',
    resource: 'finance-ops.clients.work-orders.receipts',
    pageResource: 'finance-ops.clients',
    description: 'Create, edit, and delete receipts under Work Order Details',
  },
];

async function seedModulePages(
  client: PrismaLike,
  moduleRecord: { id: string; key: string; label: string },
  pages: Array<{
    key: string;
    label: string;
    description?: string;
    routePath?: string;
    iconKey?: string;
    children?: Array<any>;
  }>,
  parentPageId?: string,
) {
  for (const [index, pageSeed] of pages.entries()) {
    const page = await client.modulePage.upsert({
      where: {
        moduleId_key: {
          moduleId: moduleRecord.id,
          key: pageSeed.key,
        },
      },
      update: {
        parentPageId,
        label: pageSeed.label,
        routePath: pageSeed.routePath,
        iconKey: pageSeed.iconKey,
        description: pageSeed.description,
        sortOrder: index,
        isActive: true,
      },
      create: {
        moduleId: moduleRecord.id,
        parentPageId,
        key: pageSeed.key,
        label: pageSeed.label,
        routePath: pageSeed.routePath,
        iconKey: pageSeed.iconKey,
        description: pageSeed.description,
        sortOrder: index,
        isActive: true,
      },
    });

    const resource = buildPageResource(moduleRecord.key, page.key);
    await client.permission.upsert({
      where: {
        action_resource: {
          action: 'read',
          resource,
        },
      },
      update: {
        moduleId: moduleRecord.id,
        pageId: page.id,
        description: `View the ${page.label} page in ${moduleRecord.label}`,
      },
      create: {
        moduleId: moduleRecord.id,
        pageId: page.id,
        action: 'read',
        resource,
        description: `View the ${page.label} page in ${moduleRecord.label}`,
      },
    });

    await client.permission.upsert({
      where: {
        action_resource: {
          action: 'write',
          resource,
        },
      },
      update: {
        moduleId: moduleRecord.id,
        pageId: page.id,
        description: `Create or edit records on the ${page.label} page in ${moduleRecord.label}`,
      },
      create: {
        moduleId: moduleRecord.id,
        pageId: page.id,
        action: 'write',
        resource,
        description: `Create or edit records on the ${page.label} page in ${moduleRecord.label}`,
      },
    });

    if (pageSeed.children?.length) {
      await seedModulePages(client, moduleRecord, pageSeed.children, page.id);
    }
  }
}

export async function seedGlobalAccessCatalog(client: PrismaLike) {
  const systemModule = await client.appModule.upsert({
    where: {
      key: 'system-admin',
    },
    update: {
      label: 'System Admin',
      description: 'Tenant administration and security',
      sortOrder: 999,
      isSystem: true,
    },
    create: {
      key: 'system-admin',
      label: 'System Admin',
      description: 'Tenant administration and security',
      sortOrder: 999,
      isSystem: true,
    },
  });

  for (const [index, permissionSeed] of DEFAULT_SYSTEM_PERMISSIONS.entries()) {
    const page = await client.modulePage.upsert({
      where: {
        moduleId_key: {
          moduleId: systemModule.id,
          key: permissionSeed.pageKey,
        },
      },
      update: {
        label: permissionSeed.pageLabel,
        description: permissionSeed.pageDescription,
        sortOrder: index,
        isActive: true,
      },
      create: {
        moduleId: systemModule.id,
        key: permissionSeed.pageKey,
        label: permissionSeed.pageLabel,
        description: permissionSeed.pageDescription,
        sortOrder: index,
        isActive: true,
      },
    });

    await client.permission.upsert({
      where: {
        action_resource: {
          action: permissionSeed.action,
          resource: permissionSeed.resource,
        },
      },
      update: {
        moduleId: systemModule.id,
        pageId: page.id,
        description: permissionSeed.description,
      },
      create: {
        moduleId: systemModule.id,
        pageId: page.id,
        action: permissionSeed.action,
        resource: permissionSeed.resource,
        description: permissionSeed.description,
      },
    });
  }

  for (const [index, moduleSeed] of DEFAULT_APP_CATALOG.entries()) {
    const moduleRecord = await client.appModule.upsert({
      where: {
        key: moduleSeed.key,
      },
      update: {
        label: moduleSeed.label,
        description: moduleSeed.description,
        sortOrder: index,
        isSystem: moduleSeed.isSystem ?? false,
      },
      create: {
        key: moduleSeed.key,
        label: moduleSeed.label,
        description: moduleSeed.description,
        sortOrder: index,
        isSystem: moduleSeed.isSystem ?? false,
      },
    });

    await seedModulePages(client, moduleRecord, moduleSeed.pages);
  }

  const pageByResource = new Map<string, any>();
  const financePages = await client.modulePage.findMany({
    where: {
      module: {
        key: 'finance-ops',
      },
    },
    include: {
      module: true,
    },
  });
  financePages.forEach((page) => {
    pageByResource.set(buildPageResource(page.module.key, page.key), page);
  });

  for (const permissionSeed of FINANCE_CLIENT_NESTED_PERMISSIONS) {
    const mappedPage = pageByResource.get(permissionSeed.pageResource);
    if (!mappedPage) continue;

    await client.permission.upsert({
      where: {
        action_resource: {
          action: permissionSeed.action,
          resource: permissionSeed.resource,
        },
      },
      update: {
        moduleId: mappedPage.moduleId,
        pageId: mappedPage.id,
        description: permissionSeed.description,
      },
      create: {
        moduleId: mappedPage.moduleId,
        pageId: mappedPage.id,
        action: permissionSeed.action,
        resource: permissionSeed.resource,
        description: permissionSeed.description,
      },
    });
  }
}

export async function seedDefaultTenantPageAccess(client: PrismaLike, tenantId: string) {
  const pages = await client.modulePage.findMany({
    where: {
      OR: DEFAULT_TENANT_PAGE_KEYS.map((resource) => {
        const [moduleKey, pageKey] = resource.split('.');
        return {
          key: pageKey,
          module: {
            key: moduleKey,
          },
        };
      }),
    },
  });

  for (const page of pages) {
    await client.tenantPageAccess.upsert({
      where: {
        tenantId_pageId: {
          tenantId,
          pageId: page.id,
        },
      },
      update: {
        status: AccessStatus.ACTIVE,
      },
      create: {
        tenantId,
        pageId: page.id,
        status: AccessStatus.ACTIVE,
      },
    });
  }
}
