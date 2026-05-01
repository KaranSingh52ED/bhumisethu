import { InferSchemaType, Model, Schema, models, model } from 'mongoose';

const landCategories = [
  'residential',
  'commercial',
  'industrial',
  'agricultural',
  'mixed',
] as const;

/** One entry per catalog documentKey — entire step-2 bundle lives on the listing document. */
const listingKylItemSchema = new Schema(
  {
    typeLabel: { type: String, required: true },
    /** Cloudinary public_id — used to delete the asset when replaced or removed. */
    storedFileName: { type: String, required: true },
    /** Cloudinary secure URL — used to serve/redirect the file to clients. */
    fileUrl: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    predictedScore: { type: Number, default: null, min: 0, max: 100 },
    adminScore: { type: Number, default: null, min: 0, max: 100 },
    adminNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    uploadedAt: { type: Date, default: null },
    /** Admin workflow: pending → approved (with score) or rejected (note required for landowner). */
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { _id: false },
);

const listingSchema = new Schema(
  {
    landOwnerGoogleId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    surveyLabel: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    areaDescription: { type: String, required: true, trim: true },
    landCategory: { type: String, enum: landCategories, required: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: ['draft', 'submitted', 'reviewed'], default: 'draft' },
    /** KYL step-2: map documentKey → file + admin review (single embedded bundle per listing). */
    kylDocuments: { type: Map, of: listingKylItemSchema, default: undefined },
  },
  { timestamps: true, versionKey: false },
);

listingSchema.index({ landOwnerGoogleId: 1, createdAt: -1 });

export type LandListingRecord = InferSchemaType<typeof listingSchema>;

export const ListingModel: Model<LandListingRecord> =
  (models.LandListing as Model<LandListingRecord> | undefined) ??
  model<LandListingRecord>('LandListing', listingSchema);
