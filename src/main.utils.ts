export function getOrigin(corsOrigins?: string) {
  if (!corsOrigins) return [];

  if (corsOrigins === '*') return true;

  return corsOrigins.split(',');
}
