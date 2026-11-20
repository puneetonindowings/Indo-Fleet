import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

const candidatePaths: string[] = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'IndoWings-Backend', '.env'),
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..', '.env') : '',
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../..', '.env') : ''
].filter(p => p && fs.existsSync(p));

if (candidatePaths.length > 0) {
  dotenv.config({ path: candidatePaths[0] });
} else {
  dotenv.config();
}

