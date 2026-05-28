export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    swaggerPath: process.env.SWAGGER_PATH ?? 'api-docs',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  leadApi: {
    encryptionSecret:
      process.env.LEAD_API_ENCRYPTION_SECRET ?? process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  userProvisioning: {
    passwordMode: (process.env.USER_PROVISIONING_PASSWORD_MODE ?? 'random').toLowerCase(),
    staticPassword: process.env.USER_PROVISIONING_STATIC_PASSWORD ?? '',
    randomPasswordLength: parseInt(process.env.USER_PROVISIONING_RANDOM_PASSWORD_LENGTH ?? '12', 10),
  },
});
