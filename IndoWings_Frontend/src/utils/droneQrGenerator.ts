import JSZip from 'jszip';
import { PUBLIC_PORTAL_URL } from '../config/api';

export interface DroneQRInfo {
  id: string;
  model?: string;
  model_name?: string;
  serial_number?: string;
}

// Exact official IndoWings center pill SVG badge matching Reference Image 2
export const INDOWINGS_PILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="40" viewBox="0 0 144 40">
  <rect width="144" height="40" rx="9" fill="#000000"/>
  <g transform="translate(13, 10.5) scale(0.62)">
    <!-- Top Orange Accent -->
    <path d="M433.185.01h7.072a.541.541,0,0,1,.55.748l-.262.811a1.158,1.158,0,0,1-1.032.749h-7.072a.541.541,0,0,1-.55-.749l.262-.811A1.156,1.156,0,0,1,433.185.01Z" transform="translate(-424.348 -0.01)" fill="#ef7f1a" fill-rule="evenodd"/>
    <!-- Main Aerodynamic Body -->
    <path d="M55.862,7.511,50.919,22.646c-.949,2.9-2,7.6-9.565,7.6H5.81c-2.736,0-7.343-1.618-5.307-7.6L4.6,10.607c.243-.712.9-2.551,2.893-2.552l4.017,0c1.623.083,2.231.58,1.693,2.591L8.783,23.76c-.715,2.876,1.31,4.138,3.925,4.138H40.464c3.3,0,5.224-2.23,5.988-5.094l4.687-14c1.544-4.612-.893-6.312-5.21-6.312H24.086C21.6,2.491,16.361.129,19.238.125,27.956.112,38.8.133,47.513.127c8.612-.006,9.225,4.7,8.348,7.384ZM43.655,22.649c-.8,2.719-2.166,4.155-5.542,4.175H30c-2.335,0-3.007-1.492-2.6-2.9l4.323-12.879c.283-.816-1.1-.9-1.4.055L26.014,23.817c-.728,2.389-2,2.954-3.858,3.006H13.845c-2.313,0-2.471-1.895-1.978-3.716L16.317,9.953c.572-1.691,1.243-1.9,2.274-1.9h.769c1.764,0,1.631.981,1.234,2.172L16.527,22.369c-.266.8.1,1.44.831,1.44h1.933A1.528,1.528,0,0,0,20.9,22.568l4.089-12.035c.758-2.231,2.045-2.559,3.375-2.559h4.611c2.19,0,2.058,1.569,1.722,2.56L30.75,22.182c-.309.916.1,1.595.97,1.609l1.712.028c.715.012,1.278-.239,1.659-1.355L38.543,12.35c1.068-3.129,1.623-6.442-2.656-6.442H27.17c-2.487,0-7.625-2.366-4.848-2.366H44.669c3.115,0,4.778,1.962,3.836,4.668l-4.85,14.44Z" transform="translate(0.001 -0.118)" fill="#ffffff" fill-rule="evenodd"/>
    <!-- Bottom Orange Accent -->
    <path d="M363.23,197.13h7.149a.541.541,0,0,1,.55.748l-.262.811a1.158,1.158,0,0,1-1.032.749h-7.149a.541.541,0,0,1-.55-.749l.262-.811A1.156,1.156,0,0,1,363.23,197.13Z" transform="translate(-355.608 -193.703)" fill="#ef7f1a" fill-rule="evenodd"/>
  </g>
  <!-- Wordmark -->
  <text x="54" y="24.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="1.4px" fill="#ffffff">INDOWINGS</text>
</svg>`;

export const BADGE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(INDOWINGS_PILL_SVG)}`;

/**
 * Generates an official branded IndoWings QR code PNG as a Blob.
 * Exactly matches the reference layout:
 * - High-density QR code pointing to https://indo-fleet.vercel.app/drone/{droneId}
 * - Official centered black IndoWings winged logo pill
 * - Clean bottom area: ONLY Drone ID (bold) + Model Name
 */
export async function generateDroneQRCodeBlob(drone: DroneQRInfo): Promise<Blob> {
  const droneId = (drone.id || '').trim();
  const modelName = drone.model_name || drone.model || '700 RPAV';
  const permanentUrl = `${PUBLIC_PORTAL_URL}/drone/${encodeURIComponent(droneId)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&margin=4&data=${encodeURIComponent(permanentUrl)}`;

  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 620;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context is not supported');

  // 1. Fill clean white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Load and draw QR Code
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => reject(new Error(`Failed to load QR image for ${droneId}`));
    qrImg.src = qrImageUrl;
  });

  const qrSize = 440;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 32;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 3. Draw exact IndoWings black pill badge in center
  const badgeImg = new Image();
  await new Promise<void>((resolve, reject) => {
    badgeImg.onload = () => resolve();
    badgeImg.onerror = () => reject(new Error('Failed to load Badge image'));
    badgeImg.src = BADGE_DATA_URI;
  });

  const badgeW = 144;
  const badgeH = 40;
  const badgeX = qrX + (qrSize - badgeW) / 2;
  const badgeY = qrY + (qrSize - badgeH) / 2;
  ctx.drawImage(badgeImg, badgeX, badgeY, badgeW, badgeH);

  // 4. Draw ONLY Drone ID and Model below the QR code (strictly matching user instruction)
  ctx.textAlign = 'center';

  // Drone ID (Bold monospace)
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText(droneId, canvas.width / 2, qrY + qrSize + 48);

  // Model Name
  ctx.fillStyle = '#64748B';
  ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Model: ${modelName}`, canvas.width / 2, qrY + qrSize + 74);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Failed to convert canvas to blob for ${droneId}`));
    }, 'image/png');
  });
}

/**
 * Downloads a single drone QR code as a PNG file.
 */
export async function downloadSingleDroneQR(drone: DroneQRInfo): Promise<void> {
  const blob = await generateDroneQRCodeBlob(drone);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `IndoWings_QR_${drone.id.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Downloads multiple drone QR codes as a single .ZIP archive.
 * Guarantees zero mismatch by uniquely associating each file name with its drone ID.
 */
export async function downloadDronesAsZip(
  drones: DroneQRInfo[],
  zipFilename: string,
  onProgress?: (current: number, total: number, currentId: string) => void
): Promise<void> {
  if (!drones || drones.length === 0) {
    throw new Error('No drones provided for bulk QR download.');
  }

  const zip = new JSZip();

  for (let i = 0; i < drones.length; i++) {
    const drone = drones[i];
    if (onProgress) {
      onProgress(i + 1, drones.length, drone.id);
    }
    const blob = await generateDroneQRCodeBlob(drone);
    const sanitizedId = drone.id.replace(/[^a-zA-Z0-9-_]/g, '_');
    zip.file(`IndoWings_QR_${sanitizedId}.png`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  const safeZipName = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
  a.download = safeZipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Extracts and maps all drone objects associated with a specific order.
 * Works seamlessly whether an order has a single assigned drone or multiple reserved units.
 */
export function getDronesForOrder(order: any, fleetList?: any[]): DroneQRInfo[] {
  if (!order) return [];
  const ids = new Set<string>();

  if (order.assigned_drone_id && typeof order.assigned_drone_id === 'string' && order.assigned_drone_id.trim()) {
    ids.add(order.assigned_drone_id.trim());
  }
  if (order.drone_id && typeof order.drone_id === 'string' && order.drone_id.trim()) {
    ids.add(order.drone_id.trim());
  }

  // Handle reserved_inventory_ids (can be array or JSON string)
  let reserved = order.reserved_inventory_ids;
  if (typeof reserved === 'string') {
    try {
      reserved = JSON.parse(reserved);
    } catch {
      reserved = reserved.split(',').map((s: string) => s.trim());
    }
  }
  if (Array.isArray(reserved)) {
    reserved.forEach((item: any) => {
      if (typeof item === 'string' && item.trim()) {
        ids.add(item.trim());
      } else if (item && typeof item === 'object' && item.id) {
        ids.add(String(item.id).trim());
      }
    });
  }

  // Handle order.items
  let items = order.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (Array.isArray(items)) {
    items.forEach((item: any) => {
      if (item?.drone_id) ids.add(String(item.drone_id).trim());
      if (item?.id && (String(item.id).startsWith('INW-') || String(item.id).startsWith('DRONE-') || String(item.id).startsWith('UAV-'))) {
        ids.add(String(item.id).trim());
      }
    });
  }

  return Array.from(ids).map((id) => {
    const match = fleetList?.find(
      (d) =>
        String(d.id || '').toLowerCase() === id.toLowerCase() ||
        String(d.serial_number || '').toLowerCase() === id.toLowerCase()
    );
    return {
      id,
      model: match?.model || match?.model_name || order.drone_model || order.model || '700 RPAV',
      model_name: match?.model_name || match?.model || order.drone_model || order.model || '700 RPAV',
      serial_number: match?.serial_number || id
    };
  });
}

