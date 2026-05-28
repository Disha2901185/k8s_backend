# User, Role, and Permission Relationships

This backend does not attach roles directly to users.

The relationship is:

`Tenant -> User`

`Tenant -> Role`

`User -> UserRole -> Role`

`Role -> Permission`

## Table Purpose

### `Tenant`

The tenant is the top-level container.

- A tenant has many users.
- A tenant has many roles.
- A tenant has many permissions.

### `User`

The `User` table stores user account data such as:

- `id`
- `tenantId`
- `email`
- `firstName`
- `lastName`

A user belongs to one tenant.

A user does **not** directly store role IDs in the `User` table.

### `Role`

The `Role` table stores role definitions inside a tenant, for example:

- `admin`
- `member`

A role belongs to one tenant.

A role can be assigned to many users.

### `UserRole`

This is the bridge table between `User` and `Role`.

It stores:

- `userId`
- `roleId`

Each row means:

"this user has this role"

This is the actual role assignment table.

### `Permission`

The `Permission` table stores allowed actions such as:

- `create:users`
- `read:users`
- `update:users`

Permissions are attached to roles, not directly to users.

So the full access path is:

`User -> UserRole -> Role -> Permission`

## Why Direct User-to-Role Join Was Wrong

Your query joined `User` to `Role` like this:

```sql
SELECT u.id, u.email, r.name, r.description, r."tenantId"
FROM public."User" AS u
LEFT JOIN public."Role" AS r
  ON u."tenantId" = r."tenantId";
```

This does **not** ask:

"Which roles are assigned to this user?"

It asks:

"Which roles exist in the same tenant as this user?"

So if a tenant has two roles:

- `admin`
- `member`

then every user in that tenant will match both roles.

That is why Jane appeared with both `admin` and `member` in your query result.

## Correct Mental Model

There are two different ideas:

### 1. Roles available in a tenant

This comes from:

`User.tenantId = Role.tenantId`

That only tells you the role belongs to the same tenant.

It does **not** tell you the user has that role.

### 2. Roles actually assigned to a user

This comes from:

`User.id = UserRole.userId`

and

`UserRole.roleId = Role.id`

That is the real assignment path.

## Correct SQL To See User Roles

```sql
SELECT
  u.id,
  u.email,
  r.id AS role_id,
  r.name AS role_name,
  r.description
FROM public."User" u
LEFT JOIN public."UserRole" ur
  ON ur."userId" = u.id
LEFT JOIN public."Role" r
  ON r.id = ur."roleId"
WHERE u."tenantId" = 'your-tenant-id'
ORDER BY u.id, r.name;
```

## Correct SQL To See One User's Roles

```sql
SELECT
  u.email,
  r.name AS role_name
FROM public."User" u
LEFT JOIN public."UserRole" ur
  ON ur."userId" = u.id
LEFT JOIN public."Role" r
  ON r.id = ur."roleId"
WHERE u.email = 'jane.doe@example.com';
```

## Example

Assume this data:

### `Role`

- `admin` for tenant `T1`
- `member` for tenant `T1`

### `User`

- `jane@example.com` in tenant `T1`

### `UserRole`

- `jane@example.com -> member`

Then:

- joining `User` to `Role` by `tenantId` shows `admin` and `member`
- joining `User -> UserRole -> Role` shows only `member`

The second one is correct.

## Prisma Relationship Mapping

This is reflected in the Prisma schema:

- `User.userRoles`
- `Role.userRoles`
- `UserRole.user`
- `UserRole.role`

And the repository also loads roles through `userRoles.role`, not through tenant join.

## Quick Diagram

```text
Tenant
  |
  +-- User
  |     |
  |     +-- UserRole -- Role -- Permission
  |
  +-- Role
  |
  +-- Permission
```

## Summary

- `Tenant` contains users, roles, and permissions.
- `User` and `Role` are not directly linked.
- `UserRole` is the link table that stores actual assignments.
- `Role` carries permissions.
- To know what access a user has, always follow:

`User -> UserRole -> Role -> Permission`
