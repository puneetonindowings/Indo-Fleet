import { Request, Response, NextFunction } from 'express';

const SQL_INJECTION_PATTERN = /(\b(union\s+(all\s+)?select|exec(\s|\+)+(s|x)p\w+|drop\s+table|insert\s+into\s+.*values|alter\s+table|delete\s+from|truncate\s+table)\b|('\s*or\s*['"]?1['"]?\s*=\s*['"]?1)|(\/\*.*?\*\/)|(--\s*))/i;
const PROMPT_INJECTION_PATTERN = /(\b(ignore\s+(all\s+)?(previous|prior)\s+instructions|system\s+override\s+mode|you\s+are\s+now\s+(dan|unfiltered|jailbroken))\b)/i;
const XSS_SCRIPT_PATTERN = /(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:\s*[^\s]+)/i;

function hasInjection(val: any): boolean {
  if (typeof val === 'string') {
    return SQL_INJECTION_PATTERN.test(val) || PROMPT_INJECTION_PATTERN.test(val) || XSS_SCRIPT_PATTERN.test(val);
  }
  if (Array.isArray(val)) {
    return val.some(hasInjection);
  }
  if (val !== null && typeof val === 'object') {
    return Object.values(val).some(hasInjection);
  }
  return false;
}

export const securityShield = (req: Request, res: Response, next: NextFunction): void => {
  if (hasInjection(req.query) || hasInjection(req.params) || hasInjection(req.body)) {
    console.warn(`[securityShield] Blocked potential injection attempt from IP ${req.ip} on ${req.method} ${req.originalUrl}`);
    res.status(400).json({
      error: 'Security validation failed: Request contains disallowed syntax or potential injection pattern.'
    });
    return;
  }
  next();
};
