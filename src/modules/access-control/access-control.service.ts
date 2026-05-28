import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessStatus, Prisma } from '@prisma/client';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { seedDefaultTenantPageAccess, seedGlobalAccessCatalog } from 'src/modules/access-control/access-catalog.seed';
import { toPermissionKey } from 'src/modules/access-control/access-catalog';
import { AccessAuditQueryDto } from 'src/modules/access-control/dto/access-audit-query.dto';
import { AssignUserRolesDto } from 'src/modules/access-control/dto/assign-user-roles.dto';
import { CreateRoleDto } from 'src/modules/access-control/dto/create-role.dto';
import { UpdateRoleDto } from 'src/modules/access-control/dto/update-role.dto';
import { UpdateUserPageAccessDto } from 'src/modules/access-control/dto/update-user-page-access.dto';
import { PrismaService } from 'src/prisma/prisma.service';

export type AccessPermissionView = {
  id: string;
  key: string;
  action: string;
  resource: string;
  description: string | null;
};

export type AccessPageView = {
  id: string;
  key: string;
  label: string;
  routePath: string | null;
  iconKey: string | null;
  description: string | null;
  permissions: AccessPermissionView[];
  childPages: AccessPageView[];
  createdAt: Date;
  updatedAt: Date;
};

const HIDDEN_TENANT_APP_PAGE_RESOURCES = new Set(['system-admin.tenant']);

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionCatalog(tenantId: string) {
    await seedGlobalAccessCatalog(this.prisma);
    await seedDefaultTenantPageAccess(this.prisma, tenantId);
    return this.getModules(tenantId);
  }

  async getModules(tenantId: string) {
    await seedGlobalAccessCatalog(this.prisma);
    await seedDefaultTenantPageAccess(this.prisma, tenantId);

    const modules = await this.prisma.appModule.findMany({
      include: {
        pages: {
          where: {
            parentPageId: null,
            OR: [
              { module: { isSystem: true } },
              {
                tenantPageAccesses: {
                  some: {
                    tenantId,
                    status: AccessStatus.ACTIVE,
                  },
                },
              },
            ],
          },
          include: {
            permissions: true,
            childPages: {
              where: {
                OR: [
                  { module: { isSystem: true } },
                  {
                    tenantPageAccesses: {
                      some: {
                        tenantId,
                        status: AccessStatus.ACTIVE,
                      },
                    },
                  },
                ],
              },
              include: {
                permissions: true,
              },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return modules
      .map((moduleRecord) => ({
        id: moduleRecord.id,
        key: moduleRecord.key,
        label: moduleRecord.label,
        description: moduleRecord.description,
        isSystem: moduleRecord.isSystem,
        createdAt: moduleRecord.createdAt,
        updatedAt: moduleRecord.updatedAt,
        pages: moduleRecord.pages
          .map((page) => this.mapPageWithPermissions(page))
          .map((page) => this.filterTenantAppPage(moduleRecord.key, page))
          .filter((page): page is AccessPageView => Boolean(page)),
      }))
      .filter((moduleRecord) => moduleRecord.pages.length > 0);
  }

  async getNavigation(tenantId: string, currentUser: JwtUser) {
    const modules = await this.getModules(tenantId);
    const grantedPermissions = new Set(currentUser.permissions);

    return modules
      .filter((moduleRecord) => !moduleRecord.isSystem)
      .map((moduleRecord) => ({
        ...moduleRecord,
        pages: moduleRecord.pages
          .map((page) => this.filterNavigationPage(page, grantedPermissions))
          .filter((page): page is AccessPageView => Boolean(page)),
      }))
      .filter((moduleRecord) => moduleRecord.pages.length > 0);
  }

  async getRoles(tenantId: string) {
    await seedGlobalAccessCatalog(this.prisma);

    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            module: true,
            page: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions
        .map((permission: any) => ({
          key: toPermissionKey(permission.action, permission.resource),
          action: permission.action,
          resource: permission.resource,
          description: permission.description,
          moduleId: permission.moduleId,
          moduleKey: permission.module?.key ?? null,
          moduleLabel: permission.module?.label ?? null,
          pageId: permission.pageId,
          pageKey: permission.page?.key ?? null,
          pageLabel: permission.page?.label ?? null,
          routePath: permission.page?.routePath ?? null,
        }))
        .sort((left: any, right: any) => left.key.localeCompare(right.key)),
      assignedUsersCount: role._count.userRoles,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async createRole(tenantId: string, actor: JwtUser, dto: CreateRoleDto) {
    await seedGlobalAccessCatalog(this.prisma);

    const existingRole = await this.prisma.role.findFirst({
      where: {
        tenantId,
        name: dto.name,
      },
    });

    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    const permissions = await this.resolvePermissions(tenantId, dto.permissionKeys);

    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        permissions: {
          connect: permissions.map((permission: any) => ({ id: permission.id })),
        },
      },
      include: {
        permissions: true,
      },
    });

    await this.logEvent({
      tenantId,
      actorUserId: actor.sub,
      roleId: role.id,
      entityType: 'role',
      entityId: role.id,
      eventType: 'role.created',
      summary: `Created role ${role.name}`,
      metadata: {
        name: role.name,
        permissionKeys: dto.permissionKeys,
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((permission) => toPermissionKey(permission.action, permission.resource)),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async updateRole(tenantId: string, roleId: string, actor: JwtUser, dto: UpdateRoleDto) {
    await seedGlobalAccessCatalog(this.prisma);

    const existingRole = await this.prisma.role.findFirst({
      where: {
        tenantId,
        id: roleId,
      },
      include: {
        permissions: true,
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name && dto.name !== existingRole.name) {
      const duplicate = await this.prisma.role.findFirst({
        where: {
          tenantId,
          name: dto.name,
          id: { not: roleId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Role name already exists');
      }
    }

    const nextPermissionKeys = dto.permissionKeys
      ? [...new Set(dto.permissionKeys)].sort()
      : existingRole.permissions
          .map((permission) => toPermissionKey(permission.action, permission.resource))
          .sort();

    const permissions = dto.permissionKeys
      ? await this.resolvePermissions(tenantId, dto.permissionKeys)
      : existingRole.permissions;

    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name,
        description: dto.description,
        ...(dto.permissionKeys
          ? {
              permissions: {
                set: permissions.map((permission: any) => ({ id: permission.id })),
              },
            }
          : {}),
      },
      include: {
        permissions: true,
      },
    });

    await this.logEvent({
      tenantId,
      actorUserId: actor.sub,
      roleId: updatedRole.id,
      entityType: 'role',
      entityId: updatedRole.id,
      eventType: 'role.updated',
      summary: `Updated role ${updatedRole.name}`,
      metadata: {
        previous: {
          name: existingRole.name,
          description: existingRole.description,
          permissionKeys: existingRole.permissions
            .map((permission) => toPermissionKey(permission.action, permission.resource))
            .sort(),
        },
        next: {
          name: updatedRole.name,
          description: updatedRole.description,
          permissionKeys: nextPermissionKeys,
        },
      },
    });

    return {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      permissions: updatedRole.permissions.map((permission) =>
        toPermissionKey(permission.action, permission.resource),
      ),
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
    };
  }

  async assignUserRoles(tenantId: string, targetUserId: string, actor: JwtUser, dto: AssignUserRolesDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id: targetUserId,
        isDeleted: false,
      },
      include: {
        userRoles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextRoleIds = [...new Set(dto.roleIds)].sort();

    const roles = await this.prisma.role.findMany({
      where: {
        tenantId,
        id: { in: nextRoleIds },
      },
    });

    if (roles.length !== nextRoleIds.length) {
      throw new BadRequestException('One or more roles do not belong to the tenant');
    }

    const previousRoleIds = user.userRoles.map((userRole) => userRole.roleId).sort();
    const previousPageOverrideCount = await this.prisma.userPageAccess.count({
      where: {
        userId: user.id,
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      await tx.userPageAccess.deleteMany({ where: { userId: user.id } });

      if (nextRoleIds.length > 0) {
        await tx.userRole.createMany({
          data: nextRoleIds.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      await tx.accessAuditLog.create({
        data: {
          tenantId,
          actorUserId: actor.sub,
          targetUserId: user.id,
          entityType: 'user-role-assignment',
          entityId: user.id,
          eventType: 'user.roles.updated',
          summary: `Updated role assignment for ${user.email}`,
          metadata: {
            previousRoleIds,
            nextRoleIds,
            clearedPageOverrides: previousPageOverrideCount,
          },
        },
      });
    });

    const updatedUser = await this.prisma.user.findFirst({
      where: { tenantId, id: user.id },
      include: {
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
      },
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserSummary(updatedUser);
  }

  async getUserPageAccess(tenantId: string, userId: string) {
    await seedGlobalAccessCatalog(this.prisma);

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id: userId,
        isDeleted: false,
      },
      include: {
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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const purchasedPages = await this.getTenantAssignablePages(tenantId);
    const rolePermissionKeys = new Set(
      user.userRoles.flatMap((userRole) =>
        userRole.role.permissions.map((permission) => toPermissionKey(permission.action, permission.resource)),
      ),
    );
    const directAccessMap = new Map(
      user.userPageAccesses.map((entry) => [entry.pageId, entry]),
    );

    return {
      user: this.mapUserSummary(user),
      pages: purchasedPages.map((page) => {
        const resource = `${page.module.key}.${page.key}`;
        const directAccess = directAccessMap.get(page.id);
        const inheritedCanRead = rolePermissionKeys.has(`read:${resource}`);
        const inheritedCanWrite = rolePermissionKeys.has(`write:${resource}`);
        const effectiveCanRead = directAccess ? directAccess.canRead : inheritedCanRead;
        const effectiveCanWrite = directAccess ? directAccess.canWrite : inheritedCanWrite;

        return {
          pageId: page.id,
          moduleId: page.moduleId,
          moduleKey: page.module.key,
          moduleLabel: page.module.label,
          pageKey: page.key,
          pageLabel: page.label,
          routePath: page.routePath,
          parentPageId: page.parentPageId,
          directCanRead: directAccess?.canRead ?? null,
          directCanWrite: directAccess?.canWrite ?? null,
          inheritedCanRead,
          inheritedCanWrite,
          effectiveCanRead,
          effectiveCanWrite,
        };
      }),
    };
  }

  async updateUserPageAccess(
    tenantId: string,
    userId: string,
    actor: JwtUser,
    dto: UpdateUserPageAccessDto,
  ) {
    await seedGlobalAccessCatalog(this.prisma);

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id: userId,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const uniqueEntries = [...new Map(dto.entries.map((entry) => [entry.pageId, entry])).values()];
    if (uniqueEntries.length === 0) {
      return this.getUserPageAccess(tenantId, userId);
    }

    const userWithRoles = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id: userId,
        isDeleted: false,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!userWithRoles) {
      throw new NotFoundException('User not found');
    }

    const rolePermissionKeys = new Set(
      userWithRoles.userRoles.flatMap((userRole) =>
        userRole.role.permissions.map((permission) =>
          toPermissionKey(permission.action, permission.resource),
        ),
      ),
    );

    const allowedPages = await this.getTenantAssignablePages(
      tenantId,
      uniqueEntries.map((entry) => entry.pageId),
    );
    if (allowedPages.length !== uniqueEntries.length) {
      throw new BadRequestException('One or more pages are not available for this tenant');
    }

    const allowedPageMap = new Map(allowedPages.map((page) => [page.id, page]));

    const auditEntries = uniqueEntries.map((entry) => {
      const page = allowedPageMap.get(entry.pageId);
      const resource = page ? `${page.module.key}.${page.key}` : '';
      const inheritedCanRead = resource ? rolePermissionKeys.has(`read:${resource}`) : false;
      const inheritedCanWrite = resource ? rolePermissionKeys.has(`write:${resource}`) : false;

      return {
        pageId: entry.pageId,
        canRead: entry.canRead,
        canWrite: entry.canWrite,
        action:
          entry.canRead === inheritedCanRead && entry.canWrite === inheritedCanWrite
            ? 'reset-to-inherited'
            : 'override-upserted',
      };
    });

    await this.prisma.$transaction(async (tx) => {
      for (const entry of uniqueEntries) {
        const page = allowedPageMap.get(entry.pageId);
        if (!page) {
          throw new BadRequestException(`Page ${entry.pageId} is not available for this tenant`);
        }

        const resource = `${page.module.key}.${page.key}`;
        const inheritedCanRead = rolePermissionKeys.has(`read:${resource}`);
        const inheritedCanWrite = rolePermissionKeys.has(`write:${resource}`);
        const matchesInheritedAccess =
          entry.canRead === inheritedCanRead && entry.canWrite === inheritedCanWrite;

        if (matchesInheritedAccess) {
          await tx.userPageAccess.deleteMany({
            where: {
              userId,
              pageId: entry.pageId,
            },
          });
          continue;
        }

        await tx.userPageAccess.upsert({
          where: {
            userId_pageId: {
              userId,
              pageId: entry.pageId,
            },
          },
          update: {
            canRead: entry.canRead,
            canWrite: entry.canWrite,
          },
          create: {
            userId,
            pageId: entry.pageId,
            canRead: entry.canRead,
            canWrite: entry.canWrite,
          },
        });
      }

      await tx.accessAuditLog.create({
        data: {
          tenantId,
          actorUserId: actor.sub,
          targetUserId: userId,
          entityType: 'user-page-access',
          entityId: userId,
          eventType: 'user.page-access.updated',
          summary: `Updated page access for ${user.email}`,
          metadata: {
            entries: auditEntries,
          },
        },
      });
    });

    return this.getUserPageAccess(tenantId, userId);
  }

  async getAuditLog(tenantId: string, query: AccessAuditQueryDto) {
    const limit = query.limit ?? 50;

    return this.prisma.accessAuditLog.findMany({
      where: { tenantId },
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private filterNavigationPage(page: AccessPageView, grantedPermissions: Set<string>): AccessPageView | null {
    const childPages = page.childPages
      .map((childPage: AccessPageView) => this.filterNavigationPage(childPage, grantedPermissions))
      .filter((childPage: AccessPageView | null): childPage is AccessPageView => Boolean(childPage));

    const canView = page.permissions.some(
      (permission: AccessPermissionView) =>
        permission.action === 'read' && grantedPermissions.has(permission.key),
    );

    if (!canView && childPages.length === 0) {
      return null;
    }

    return {
      ...page,
      childPages,
    };
  }

  private mapPageWithPermissions(page: any): AccessPageView {
    return {
      id: page.id,
      key: page.key,
      label: page.label,
      routePath: page.routePath,
      iconKey: page.iconKey,
      description: page.description,
      permissions: (page.permissions || [])
        .map((permission: any) => ({
          id: permission.id,
          key: toPermissionKey(permission.action, permission.resource),
          action: permission.action,
          resource: permission.resource,
          description: permission.description,
        }))
        .sort((left: AccessPermissionView, right: AccessPermissionView) => left.key.localeCompare(right.key)),
      childPages: (page.childPages || [])
        .map((childPage: any) => this.mapPageWithPermissions(childPage))
        .sort((left: AccessPageView, right: AccessPageView) => left.label.localeCompare(right.label)),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private filterTenantAppPage(moduleKey: string, page: AccessPageView): AccessPageView | null {
    const resource = `${moduleKey}.${page.key}`;
    if (HIDDEN_TENANT_APP_PAGE_RESOURCES.has(resource)) {
      return null;
    }

    const childPages = page.childPages
      .map((childPage) => this.filterTenantAppPage(moduleKey, childPage))
      .filter((childPage): childPage is AccessPageView => Boolean(childPage));

    return {
      ...page,
      childPages,
    };
  }

  private async resolvePermissions(tenantId: string, permissionKeys: string[]) {
    const normalizedPermissionKeys = permissionKeys.flatMap((permissionKey) => {
      if (permissionKey.startsWith('write:')) {
        return [permissionKey, permissionKey.replace(/^write:/, 'read:')];
      }

      return [permissionKey];
    });

    const uniqueKeys = [...new Set(normalizedPermissionKeys)];
    const requestedPermissions = uniqueKeys.map((permissionKey) => {
      const delimiterIndex = permissionKey.indexOf(':');
      if (delimiterIndex <= 0 || delimiterIndex === permissionKey.length - 1) {
        throw new BadRequestException(`Invalid permission key: ${permissionKey}`);
      }

      return {
        action: permissionKey.slice(0, delimiterIndex),
        resource: permissionKey.slice(delimiterIndex + 1),
      };
    });

    const permissions = await this.prisma.permission.findMany({
      where: {
        OR: requestedPermissions,
      },
      include: {
        module: true,
        page: {
          include: {
            tenantPageAccesses: {
              where: {
                tenantId,
                status: AccessStatus.ACTIVE,
              },
            },
          },
        },
      },
    });

    if (permissions.length !== uniqueKeys.length) {
      throw new BadRequestException('One or more permissions are missing from the global catalog');
    }

    const disallowedPermission = permissions.find(
      (permission) =>
        permission.pageId &&
        !permission.module?.isSystem &&
        permission.page?.tenantPageAccesses.length === 0,
    );

    if (disallowedPermission) {
      throw new BadRequestException(
        `Permission ${toPermissionKey(disallowedPermission.action, disallowedPermission.resource)} is not available for this tenant`,
      );
    }

    return permissions;
  }


  private async getTenantAssignablePages(tenantId: string, pageIds?: string[]) {
    return this.prisma.modulePage.findMany({
      where: {
        ...(pageIds ? { id: { in: pageIds } } : {}),
        NOT: {
          key: 'tenant',
          module: {
            key: 'system-admin',
          },
        },
        OR: [
          { module: { isSystem: true } },
          {
            tenantPageAccesses: {
              some: {
                tenantId,
                status: AccessStatus.ACTIVE,
              },
            },
          },
        ],
      },
      include: {
        module: true,
      },
      orderBy: [{ module: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private mapUserSummary(user: {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userRoles: Array<{
      role: {
        id: string;
        name: string;
        permissions: Array<{ action: string; resource: string }>;
      };
    }>;
    userPageAccesses?: Array<{
      canRead: boolean;
      canWrite: boolean;
      page: {
        key: string;
        module: {
          key: string;
        };
      };
    }>;
  }) {
    const rolePermissions = new Set(
      user.userRoles.flatMap((userRole) =>
        userRole.role.permissions.map((permission) => toPermissionKey(permission.action, permission.resource)),
      ),
    );
    const overrideResources = new Set(
      (user.userPageAccesses ?? []).map((entry) => `${entry.page.module.key}.${entry.page.key}`),
    );
    const permissions = [...rolePermissions].filter((permissionKey) => {
      const delimiterIndex = permissionKey.indexOf(':');
      const resource = delimiterIndex >= 0 ? permissionKey.slice(delimiterIndex + 1) : permissionKey;
      return !overrideResources.has(resource);
    });

    for (const entry of user.userPageAccesses ?? []) {
      const resource = `${entry.page.module.key}.${entry.page.key}`;
      if (entry.canRead) {
        permissions.push(`read:${resource}`);
      }
      if (entry.canWrite) {
        permissions.push(`write:${resource}`);
      }
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roleIds: user.userRoles.map((userRole) => userRole.role.id),
      roles: user.userRoles.map((userRole) => userRole.role.name),
      permissions: [...new Set(permissions)],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async logEvent(data: {
    tenantId: string;
    actorUserId: string;
    targetUserId?: string;
    roleId?: string;
    entityType: string;
    entityId?: string;
    eventType: string;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.prisma.accessAuditLog.create({ data });
  }
}


