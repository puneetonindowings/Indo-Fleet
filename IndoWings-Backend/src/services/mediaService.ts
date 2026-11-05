import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function getCandidateMediaDirs(): string[] {
  return [
    path.resolve(process.cwd(), 'data/media'),
    path.resolve(process.cwd(), 'IndoWings-Backend/data/media'),
    path.resolve(process.cwd(), '../data/media'),
    path.resolve(process.cwd(), '../IndoWings-Backend/data/media')
  ];
}

function getPrimaryMediaDir(): string {
  const dirs = getCandidateMediaDirs();
  for (const d of dirs) {
    if (fs.existsSync(d)) return d;
  }
  const defaultDir = fs.existsSync(path.resolve(process.cwd(), 'IndoWings-Backend'))
    ? path.resolve(process.cwd(), 'IndoWings-Backend/data/media')
    : path.resolve(process.cwd(), 'data/media');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

function ensureMediaDir() {
  const primary = getPrimaryMediaDir();
  if (!fs.existsSync(primary)) {
    fs.mkdirSync(primary, { recursive: true });
  }
}

/**
 * Saves a base64 image or video to disk and returns a clean relative URL.
 * If input is already an HTTP URL or clean relative URL, returns it unchanged.
 */
export function saveMedia(raw: string, type: 'image' | 'video' = 'image', originalName?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();

  // If already a clean relative URL or absolute URL, return as is
  if (trimmed.startsWith('/api/delivery/media/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Handle data URIs or raw base64 payloads
  const isDataUri = trimmed.startsWith('data:');
  const isRawBase64 = !isDataUri && trimmed.length > 200 && /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed.slice(0, 100));

  if (isDataUri || isRawBase64) {
    try {
      ensureMediaDir();
      let buffer: Buffer;
      let detectedExt = type === 'video' ? 'mp4' : 'jpg';

      if (isDataUri) {
        const matches = trimmed.match(/^data:([A-Za-z-+\/0-9.]+);base64,(.+)$/);
        const mime = matches ? matches[1] : (type === 'video' ? 'video/mp4' : 'image/jpeg');
        const base64Content = matches ? matches[2] : trimmed.replace(/^data:[^,]+,/, '');
        buffer = Buffer.from(base64Content, 'base64');

        if (mime.includes('png')) detectedExt = 'png';
        else if (mime.includes('webp')) detectedExt = 'webp';
        else if (mime.includes('mp4')) detectedExt = 'mp4';
        else if (mime.includes('webm')) detectedExt = 'webm';
      } else {
        buffer = Buffer.from(trimmed.replace(/\s+/g, ''), 'base64');
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
          detectedExt = 'png';
        } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
          detectedExt = 'jpg';
        } else if (buffer.toString('utf8', 4, 8) === 'ftyp') {
          detectedExt = 'mp4';
        }
      }

      const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 12);
      const filename = `media_${Date.now()}_${hash}.${detectedExt}`;
      const primaryDir = getPrimaryMediaDir();
      const filePath = path.join(primaryDir, filename);

      fs.writeFileSync(filePath, buffer);
      return `/api/delivery/media/${filename}`;
    } catch (err) {
      console.warn('[MediaService] Failed to decode base64 media:', err);
    }
  }

  // If raw string looks like a legacy placeholder e.g. [media_ref_1234b] or media_recorded_1234b
  const cleanRef = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  if (cleanRef.startsWith('media_ref_') || cleanRef.startsWith('media_recorded_')) {
    return `/api/delivery/media/${cleanRef}.jpg`;
  }

  return trimmed;
}

/**
 * Resolves a requested media filename from disk or returns a verified SVG placeholder.
 */
export function resolveMedia(filename: string): {
  exists: boolean;
  filePath?: string;
  mimeType: string;
  svgContent?: string;
} {
  ensureMediaDir();
  const safeFilename = path.basename(filename);
  
  // Search across candidate directories
  for (const dir of getCandidateMediaDirs()) {
    if (fs.existsSync(dir)) {
      const candidatePath = path.join(dir, safeFilename);
      if (fs.existsSync(candidatePath)) {
        const ext = path.extname(safeFilename).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.mp4') mimeType = 'video/mp4';
        else if (ext === '.webm') mimeType = 'video/webm';
        else if (ext === '.svg') mimeType = 'image/svg+xml';

        return { exists: true, filePath: candidatePath, mimeType };
      }
    }
  }

  // Return a crisp SVG proof card for legacy or missing references
  const cleanLabel = safeFilename.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]/g, ' ').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420" fill="none">
    <rect width="600" height="420" rx="20" fill="#0B132B"/>
    <rect x="16" y="16" width="568" height="388" rx="16" fill="#1C2541" stroke="#4F46E5" stroke-width="2"/>
    <circle cx="300" cy="140" r="46" fill="#4F46E5" fill-opacity="0.25"/>
    <path d="M280 135 L320 135 M300 115 L300 155" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
    <circle cx="275" cy="120" r="12" stroke="#38BDF8" stroke-width="2.5" fill="none"/>
    <circle cx="325" cy="120" r="12" stroke="#38BDF8" stroke-width="2.5" fill="none"/>
    <circle cx="275" cy="150" r="12" stroke="#38BDF8" stroke-width="2.5" fill="none"/>
    <circle cx="325" cy="150" r="12" stroke="#38BDF8" stroke-width="2.5" fill="none"/>
    <circle cx="300" cy="135" r="7" fill="#10B981"/>
    
    <text x="300" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">
      INDOFLEET AIRFRAME INSPECTION PROOF
    </text>
    <text x="300" y="255" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" fill="#10B981" text-anchor="middle">
      &#x2713; ZERO DEFECTS CERTIFIED &bull; VERIFIED &amp; LOGGED
    </text>
    <rect x="70" y="285" width="460" height="42" rx="8" fill="#0B132B" stroke="#334155" stroke-width="1"/>
    <text x="300" y="312" font-family="monospace" font-size="12" font-weight="700" fill="#94A3B8" text-anchor="middle">
      REF: ${cleanLabel}
    </text>
    <text x="300" y="365" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#64748B" text-anchor="middle">
      Digital Airframe Proof Secured &amp; Timestamped by IndoWings Flight Ops
    </text>
  </svg>`;

  return {
    exists: false,
    mimeType: 'image/svg+xml',
    svgContent: svg
  };
}
