import type { Request } from 'express';

export interface ClientDetails {
  rawIp: string;
  displayIp: string;
  device: string;
  userAgent: string;
}

/**
 * Parses human-readable device and browser info from the User-Agent header.
 */
export function parseDeviceFromUserAgent(ua?: string): string {
  if (!ua || typeof ua !== 'string') return 'Unknown Device / Web Client';

  // Mobile App check
  if (ua.includes('IndoFleet') || ua.includes('okhttp') || ua.includes('Dart') || ua.includes('Expo')) {
    return 'IndoFleet Mobile App (Android/iOS)';
  }

  // OS detection
  let os = 'Unknown OS';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone')) os = 'iPhone (iOS)';
  else if (ua.includes('iPad')) os = 'iPad (iPadOS)';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Browser detection (order matters because Chrome UA includes Safari)
  let browser = 'Web Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('PostmanRuntime')) browser = 'Postman API Client';
  else if (ua.includes('curl/')) browser = 'cURL Tool';

  return `${browser} on ${os}`;
}

/**
 * Extracts the real client IP address, supporting Cloudflare, Nginx reverse proxies,
 * AWS ALBs, and standard Express connections, while formatting local loopbacks cleanly.
 */
export function getClientDetails(req: Request): ClientDetails {
  const ua = req.headers['user-agent'] || '';

  // 1. Cloudflare header
  let rawIp = '';
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    rawIp = cfIp.trim();
  }

  // 2. Nginx real IP header
  if (!rawIp) {
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      rawIp = realIp.trim();
    }
  }

  // 3. Standard proxy forwarded header (take the leftmost client IP)
  if (!rawIp) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const firstIp = list.split(',')[0].trim();
      if (firstIp) rawIp = firstIp;
    }
  }

  // 4. Express req.ip or socket fallback
  if (!rawIp) {
    rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  // Clean IPv4-mapped IPv6 (::ffff:192.168.1.1 -> 192.168.1.1)
  rawIp = rawIp.replace(/^::ffff:/, '');

  // Format loopbacks / localhost for human-readable security emails
  let displayIp = rawIp;
  if (rawIp === '::1' || rawIp === '127.0.0.1' || rawIp === 'localhost') {
    displayIp = '127.0.0.1 (Localhost / Development)';
  }

  const device = parseDeviceFromUserAgent(ua);

  return {
    rawIp,
    displayIp,
    device,
    userAgent: ua
  };
}
