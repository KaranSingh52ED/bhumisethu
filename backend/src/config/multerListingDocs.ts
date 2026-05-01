import multer from 'multer';

const allowedMimes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Vercel Hobby enforces a hard 4.5 MB request-body limit at the edge.
// We set 4 MB here to leave headroom for multipart form boundaries/headers.
const maxBytes = 4 * 1024 * 1024;

export const listingDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF and image uploads are allowed.'));
  },
});
