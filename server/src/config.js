import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const SERVER_DIR = resolve(__dirname, '..');
export const UPLOADS_DIR = join(SERVER_DIR, 'uploads');
export const DATA_DIR = join(SERVER_DIR, 'data');

export const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

ensureDir(UPLOADS_DIR);
ensureDir(DATA_DIR);
