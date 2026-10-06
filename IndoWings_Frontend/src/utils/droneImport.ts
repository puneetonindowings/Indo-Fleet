export interface DroneImportRow {
  id?: string;
  model: string;
  serial_number?: string;
  image_url?: string;
  current_city?: string;
}

const decodeXml = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function parseDelimited(text: string, delimiter?: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const separator = delimiter || (firstLine.includes('\t') ? '\t' : ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === separator && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function toDroneRows(rows: string[][]): DroneImportRow[] {
  if (rows.length < 2) throw new Error('Import file needs a header row and at least one drone row.');
  const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const headers = rows[0].map(key);
  const index = (...names: string[]) => headers.findIndex(header => names.includes(header));
  const modelIndex = index('model', 'dronename', 'dronemodel', 'name');
  if (modelIndex < 0) throw new Error('Add a Drone Name or Model column to the file.');
  const idIndex = index('id', 'droneid', 'assetid');
  const serialIndex = index('serial', 'serialnumber', 'serialno');
  const imageIndex = index('image', 'imageurl', 'photo', 'photourl');
  const cityIndex = index('city', 'location', 'plant', 'currentcity');
  const result = rows.slice(1).filter(row => row.some(Boolean)).map(row => ({
    id: idIndex >= 0 ? row[idIndex]?.trim() || undefined : undefined,
    model: row[modelIndex]?.trim() || '',
    serial_number: serialIndex >= 0 ? row[serialIndex]?.trim() || undefined : undefined,
    image_url: imageIndex >= 0 ? row[imageIndex]?.trim() || undefined : undefined,
    current_city: cityIndex >= 0 ? row[cityIndex]?.trim() || undefined : undefined
  }));
  if (result.some(drone => !drone.model)) throw new Error('Every imported drone must have a name/model.');
  return result;
}

async function readZipEntries(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 22) throw new Error('The Office document is too small to be valid.');
  const view = new DataView(buffer);
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65558) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Could not read the Office document container.');
  const entryCount = view.getUint16(end + 10, true);
  const centralOffset = view.getUint32(end + 16, true);
  const entries = new Map<string, string>();
  let cursor = centralOffset;
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('The Office document contains an invalid archive entry.');
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let contents: Uint8Array;
    if (method === 0) contents = compressed;
    else if (method === 8) {
      const stream = new Blob([copyToArrayBuffer(compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      contents = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      cursor += 46 + fileNameLength + extraLength + commentLength;
      continue;
    }
    entries.set(name, new TextDecoder().decode(contents));
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function parseXlsxXml(sheet: string, shared: string): string[][] {
  const strings = [...shared.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(item => decodeXml(item[1])).join('')
  );
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = cellMatch[1].match(/\br="([A-Z]+)\d+"/)?.[1] || '';
      let col = 0;
      for (const char of ref) col = col * 26 + char.charCodeAt(0) - 64;
      const value = cellMatch[1].includes('t="s"')
        ? strings[Number(cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1])] || ''
        : decodeXml([...cellMatch[2].matchAll(/<(?:v|t)\b[^>]*>([\s\S]*?)<\/(?:v|t)>/g)].map(item => item[1]).join(''));
      if (col) row[col - 1] = value;
    }
    rows.push(row.map(value => value || ''));
  }
  return rows;
}

async function parsePdfText(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);
  const streams: string[] = [];
  for (const match of raw.matchAll(/<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let data = match[2];
    if (/\/FlateDecode/.test(match[1])) {
      try {
        const start = (match.index || 0) + match[0].indexOf('stream') + 6 + (match[0].includes('stream\r\n') ? 2 : 1);
        const compressed = bytes.slice(start, start + data.length);
        const stream = new Blob([copyToArrayBuffer(compressed)]).stream().pipeThrough(new DecompressionStream('deflate'));
        data = new TextDecoder('latin1').decode(await new Response(stream).arrayBuffer());
      } catch {
        continue;
      }
    }
    streams.push(data);
  }
  const literals: string[] = [];
  for (const stream of streams) {
    for (const match of stream.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:.|\n)*?)\]\s*TJ/g)) {
      const content = match[1] ?? match[2] ?? '';
      for (const part of content.matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f]+)>/g)) {
        if (part[1] !== undefined) literals.push(part[1].replace(/\\([\\()])/g, '$1').replace(/\\n/g, ' '));
        else if (part[2]) {
          const hex = part[2].replace(/(..)/g, '%$1');
          try { literals.push(decodeURIComponent(hex)); } catch { /* Skip malformed glyph sequences. */ }
        }
      }
    }
  }
  return literals.join(' ').replace(/\s+/g, ' ').trim();
}

export async function parseDroneImportFile(file: File): Promise<DroneImportRow[]> {
  if (file.size > 15_000_000) throw new Error('Import file must be smaller than 15 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    return toDroneRows(parseDelimited(await file.text()));
  }
  if (extension === 'xlsx') {
    const entries = await readZipEntries(await file.arrayBuffer());
    const sheet = entries.get('xl/worksheets/sheet1.xml');
    if (!sheet) throw new Error('Could not find the first worksheet in this Excel file.');
    return toDroneRows(parseXlsxXml(sheet, entries.get('xl/sharedStrings.xml') || ''));
  }
  if (extension === 'docx') {
    const entries = await readZipEntries(await file.arrayBuffer());
    const document = entries.get('word/document.xml');
    if (!document) throw new Error('Could not read the Word document contents.');
    const tableRows = [...document.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map(row =>
      [...row[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map(cell =>
        [...cell[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(item => decodeXml(item[1])).join(' ')
      )
    );
    const lines = tableRows.length
      ? tableRows.map(row => row.join('\t'))
      : [...document.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(paragraph =>
        [...paragraph[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(item => decodeXml(item[1])).join('\t')
      );
    return toDroneRows(parseDelimited(lines.join('\n'), '\t'));
  }
  if (extension === 'pdf') {
    const text = await parsePdfText(await file.arrayBuffer());
    return toDroneRows(parseDelimited(text));
  }
  throw new Error('Use a CSV, TSV, XLSX, PDF, or DOCX file.');
}
