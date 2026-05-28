export type SystemPermissionSeed = {
  pageKey: string;
  pageLabel: string;
  pageDescription?: string;
  action: string;
  resource: string;
  description: string;
};

export type GlobalPageSeed = {
  key: string;
  label: string;
  description?: string;
  routePath?: string;
  iconKey?: string;
  children?: GlobalPageSeed[];
};

export type GlobalModuleSeed = {
  key: string;
  label: string;
  description?: string;
  isSystem?: boolean;
  pages: GlobalPageSeed[];
};

export const SYSTEM_MODULE_KEY = 'system';
export const SYSTEM_MODULE_LABEL = 'System';

export const DEFAULT_SYSTEM_PERMISSIONS: SystemPermissionSeed[] = [
  {
    pageKey: 'tenant',
    pageLabel: 'Tenant',
    pageDescription: 'Tenant administration',
    action: 'create',
    resource: 'tenant',
    description: 'Create tenant records',
  },
  {
    pageKey: 'tenant',
    pageLabel: 'Tenant',
    pageDescription: 'Tenant administration',
    action: 'read',
    resource: 'tenant',
    description: 'View tenant details',
  },
  {
    pageKey: 'users',
    pageLabel: 'Member Management',
    pageDescription: 'Member administration',
    action: 'create',
    resource: 'users',
    description: 'Create tenant members',
  },
  {
    pageKey: 'users',
    pageLabel: 'Member Management',
    pageDescription: 'Member administration',
    action: 'read',
    resource: 'users',
    description: 'View tenant members',
  },
  {
    pageKey: 'users',
    pageLabel: 'Member Management',
    pageDescription: 'Member administration',
    action: 'update',
    resource: 'users',
    description: 'Edit tenant members',
  },
  {
    pageKey: 'users',
    pageLabel: 'Member Management',
    pageDescription: 'Member administration',
    action: 'delete',
    resource: 'users',
    description: 'Delete tenant members',
  },
  {
    pageKey: 'access',
    pageLabel: 'Access Control',
    pageDescription: 'Role, permission, and access management',
    action: 'manage',
    resource: 'access',
    description: 'Manage roles, permissions, and user access',
  },
];

export const DEFAULT_APP_CATALOG: GlobalModuleSeed[] = [
  {
    key: 'main',
    label: 'Main',
    description: 'Primary dashboard and landing pages',
    pages: [
      { key: 'dashboard', label: 'Dashboard', routePath: '/', iconKey: 'layout-dashboard' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    description: 'Sales operations and customer pipeline',
    pages: [
      { key: 'leads', label: 'Leads', routePath: '/leads', iconKey: 'magnet' },
      { key: 'pipeline', label: 'Pipeline', routePath: '/pipeline', iconKey: 'kanban' },
      { key: 'companies', label: 'Companies', routePath: '/companies', iconKey: 'building-2' },
      { key: 'contacts', label: 'Contacts', routePath: '/contacts', iconKey: 'users' },
      { key: 'associates', label: 'Associates', routePath: '/associates', iconKey: 'user-cog' },
    ],
  },
  {
    key: 'finance-ops',
    label: 'Finance & Ops',
    description: 'Finance and operations pages',
    pages: [
      { key: 'clients', label: 'Clients', routePath: '/clients', iconKey: 'briefcase' },
      { key: 'orders', label: 'Orders', routePath: '/orders', iconKey: 'file-text' },
      { key: 'invoices', label: 'Invoices', routePath: '/invoices', iconKey: 'receipt' },
      { key: 'receipts', label: 'Receipts', routePath: '/receipts', iconKey: 'wallet' },
      { key: 'collection-projection', label: 'Collection Projection', routePath: '/collection-projection', iconKey: 'bar-chart-3' },
    ],
  },
  {
    key: 'intelligence',
    label: 'Intelligence',
    description: 'Reporting and analytics',
    pages: [
      {
        key: 'reports',
        label: 'Reports',
        iconKey: 'bar-chart-3',
        children: [
          { key: 'registers', label: 'Registers', routePath: '/registers' },
          { key: 'tax-reports', label: 'Tax Reports', routePath: '/tax-reports' },
        ],
      },
    ],
  },
  {
    key: 'system',
    label: 'System',
    description: 'System pages for tenant operations',
    pages: [
      {
        key: 'settings',
        label: 'Settings',
        routePath: '/settings',
        iconKey: 'settings',
        children: [
          { key: 'my-keys', label: 'My Keys', routePath: '/settings/my-keys', iconKey: 'key-round' },
          { key: 'tenant-profile', label: 'Profile', routePath: '/settings/tenant-profile', iconKey: 'building-2' },
        ],
      },
    ],
  },
];

export const DEFAULT_TENANT_PAGE_KEYS = [
  'main.dashboard',
  'sales.leads',
  'sales.pipeline',
  'sales.companies',
  'sales.contacts',
  'sales.associates',
  'finance-ops.clients',
  'finance-ops.orders',
  'finance-ops.invoices',
  'finance-ops.receipts',
  'finance-ops.collection-projection',
  'system.settings',
  'system.my-keys',
  'system.tenant-profile',
];

export const DEFAULT_MEMBER_PERMISSION_KEYS = ['read:main.dashboard'];

export const buildPageResource = (moduleKey: string, pageKey: string) => `${moduleKey}.${pageKey}`;
export const toPermissionKey = (action: string, resource: string) => `${action}:${resource}`;
