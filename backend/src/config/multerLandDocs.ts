import multer from 'multer';

const allowedMimes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// 10 MB — matches Cloudinary free-plan upload limit for images and raw files.
const maxBytes = 10 * 1024 * 1024;

export const landDocumentUpload = multer({
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
