export interface JwtUser {
  sub: string;
  email: string;
  tenantId: string;
  sessionId: string;
  jti: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
}
