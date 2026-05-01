import { InferSchemaType, Model, Schema, models, model } from 'mongoose';

const submissionStatuses = ['pending_review', 'approved', 'rejected'] as const;

const landOwnerDocumentSchema = new Schema(
  {
    landOwnerGoogleId: { type: String, required: true, index: true },
    documentKey: { type: String, required: true },
    category: { type: String, required: true },
    typeLabel: { type: String, required: true },
    optional: { type: Boolean, default: false },
    /** Cloudinary public_id — used to delete the asset when replaced or removed. */
    storedFileName: { type: String, required: true },
    /** Cloudinary secure URL — used to serve/redirect the file to clients. */
    fileUrl: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    predictedScore: { type: Number, min: 0, max: 100, default: null },
    status: {
      type: String,
      enum: submissionStatuses,
      default: 'pending_review',
    },
    adminScore: { type: Number, min: 0, max: 100, default: null },
    adminNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

landOwnerDocumentSchema.index({ landOwnerGoogleId: 1, documentKey: 1 }, { unique: true });
landOwnerDocumentSchema.index({ status: 1, landOwnerGoogleId: 1 });

export type LandOwnerDocumentSubmission = InferSchemaType<typeof landOwnerDocumentSchema>;

export const LandOwnerDocumentModel: Model<LandOwnerDocumentSubmission> =
  (models.LandOwnerDocument as Model<LandOwnerDocumentSubmission> | undefined) ??
  model<LandOwnerDocumentSubmission>('LandOwnerDocument', landOwnerDocumentSchema);
