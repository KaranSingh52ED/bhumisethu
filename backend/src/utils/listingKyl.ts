/**
 * Helpers for embedded KYL (step 2) data on LandListing — one map per listing, not one row per file.
 */

export type ListingKylItem = {
  typeLabel: string;
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  adminScore: number | null;
  adminNote: string;
  reviewedAt: Date | null;
  uploadedAt: Date | null;
  reviewStatus?: 'pending' | 'approved' | 'rejected' | null;
};

/** Resolve status for legacy rows (before reviewStatus existed). */
export const effectiveReviewStatus = (item: {
  reviewStatus?: string | null;
  adminScore?: number | null;
}): 'pending' | 'approved' | 'rejected' => {
  const rs = item.reviewStatus;
  if (rs === 'approved' || rs === 'rejected' || rs === 'pending') return rs;
  if (item.adminScore != null && !Number.isNaN(item.adminScore as number)) return 'approved';
  return 'pending';
};

/** Normalize Mongoose Map or plain object from .lean() into a string-keyed record. */
export const kylMapToRecord = (raw: unknown): Record<string, ListingKylItem> => {
  if (raw == null) return {};
  if (raw instanceof Map) return Object.fromEntries(raw) as Record<string, ListingKylItem>;
  return raw as Record<string, ListingKylItem>;
};

export const countKylUploads = (raw: unknown): number => Object.keys(kylMapToRecord(raw)).length;

/** Shape expected by computeListingKYLMetrics / allRequiredCategoriesScored. */
export const kylRecordToScoreRows = (
  raw: unknown,
): Array<{
  documentKey: string;
  adminScore?: number | null;
  reviewStatus?: string | null;
}> => {
  const rec = kylMapToRecord(raw);
  return Object.entries(rec).map(([documentKey, v]) => ({
    documentKey,
    adminScore: v?.adminScore ?? null,
    reviewStatus: v?.reviewStatus ?? null,
  }));
};
