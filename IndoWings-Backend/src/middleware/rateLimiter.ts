import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function getClientIp(req: Request): string {
  let ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
}

/**
 * Creates an Express rate limiting middleware with IP spoof protection
 * and account-level brute-force defense.
 */
export const createRateLimiter = (
  windowMs: number = 15 * 60 * 1000,
  maxRequests: number = 10,
  message: string = 'Too many requests. Please try again after a few minutes.'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = getClientIp(req);
    const basePath = `${req.baseUrl || ''}${req.path}`;
    const now = Date.now();

    const keys: string[] = [`${basePath}:ip:${clientIp}`];
    const rawTarget = req.body?.email || req.body?.phone;
    if (rawTarget && typeof rawTarget === 'string' && rawTarget.trim()) {
      keys.push(`${basePath}:target:${rawTarget.toLowerCase().trim()}`);
    }

    for (const key of keys) {
      const record = rateLimitStore.get(key);
      if (record && now <= record.resetTime && record.count >= maxRequests) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        res.status(429).json({
          error: message,
          retryAfterSeconds
        });
        return;
      }
    }

    for (const key of keys) {
      const record = rateLimitStore.get(key);
      if (!record || now > record.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      } else {
        record.count += 1;
      }
    }

    next();
  };
};
