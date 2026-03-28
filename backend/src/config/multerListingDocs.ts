import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const allowedMimes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const maxBytes = 15 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.length <= 8 ? ext : '';
    const name = `listing-doc-${Date.now()}-${randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, name);
  },
});

export const listingDocumentUpload = multer({
  storage,
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF and image uploads are allowed.'));
  },
});
