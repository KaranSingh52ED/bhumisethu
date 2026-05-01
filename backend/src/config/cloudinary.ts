import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';
import { env } from './env';

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure: true,
});

/** PDFs are stored as 'raw'; images are stored as 'image'. */
const getResourceType = (mimeType: string): 'image' | 'raw' =>
  mimeType === 'application/pdf' ? 'raw' : 'image';

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

/**
 * Upload a file buffer to Cloudinary.
 * Returns the secure URL and the public_id (used for future deletions).
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  mimeType: string,
  folder: string,
  prefix: string,
): Promise<CloudinaryUploadResult> => {
  const resourceType = getResourceType(mimeType);
  const publicIdBase = `${prefix}-${Date.now()}-${randomBytes(6).toString('hex')}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdBase,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error('Cloudinary upload failed'));
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by its public_id.
 * Silently swallows errors so a missing asset never blocks business logic.
 */
export const deleteFromCloudinary = async (publicId: string, mimeType: string): Promise<void> => {
  const resourceType = getResourceType(mimeType);
  await cloudinary.uploader
    .destroy(publicId, { resource_type: resourceType })
    .catch(() => undefined);
};

export default cloudinary;
