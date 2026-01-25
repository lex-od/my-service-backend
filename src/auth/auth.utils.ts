import crypto from 'crypto';
import { Request as ExpressRequest } from 'express';

export function generateSixDigitsCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function hashRefreshToken(raw: string, pepper: string) {
  return crypto
    .createHash('sha256')
    .update(raw + pepper)
    .digest('hex');
}

// Extracts the client IP address from the request,
// taking into account the proxy/load balancer
export function getClientIp(req: ExpressRequest) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ipString = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    return ipString.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return req.ip || req.socket?.remoteAddress;
}
