import crypto from 'crypto';

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashRefreshToken(raw: string, pepper: string): string {
  return crypto
    .createHash('sha256')
    .update(raw + pepper)
    .digest('hex');
}
