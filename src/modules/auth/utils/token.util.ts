const ttlPattern = /^(\d+)([smhd])$/;

export function ttlToSeconds(ttl: string): number {
  const match = ttl.trim().match(ttlPattern);
  if (!match) {
    throw new Error(`Invalid TTL value: ${ttl}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Unsupported TTL unit: ${unit}`);
  }
}
