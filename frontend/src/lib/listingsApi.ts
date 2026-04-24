const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export type LandCategory = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed';

export interface CreateListingPayload {
  title: string;
  surveyLabel: string;
  location: string;
  areaDescription: string;
  landCategory: LandCategory;
  description?: string;
}

export interface CreatedListing {
  id: string;
  title: string;
  surveyLabel: string;
  location: string;
  areaDescription: string;
  landCategory: string;
  description: string;
  status: string;
  createdAt?: string;
}

export interface MyListing {
  id: string;
  title: string;
  surveyLabel: string;
  location: string;
  areaDescription: string;
  landCategory: string;
  description: string;
  status: string;
  cumulativeScore: number | null;
  scoredDocCount: number;
  predictedKylScore: number | null;
  predictedScoredDocCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ListingDocumentReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ListingDocumentSubmissionDto {
  /** Stable id — same as `documentKey` (embedded KYL bundle per listing). */
  id: string;
  documentKey: string;
  category: string;
  typeLabel: string;
  optional: boolean;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  predictedScore: number | null;
  adminScore: number | null;
  /** Admin workflow; landowner sees rejection notes via `adminNote`. */
  adminNote: string;
  reviewStatus: ListingDocumentReviewStatus;
  reviewedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListingDocumentsResponse {
  listingId: string;
  listingStatus: string;
  cumulativeScore: number | null;
  scoredDocCount: number;
  predictedKylScore: number | null;
  predictedScoredDocCount: number;
  /** Total required categories in the KYL catalog. */
  kylRequiredTotal?: number;
  totalUploaded: number;
  items: Array<{
    documentKey: string;
    category: string;
    description?: string;
    group?: string;
    groupLabel?: string;
    sortOrder?: number;
    /** All accepted document types for this category — user picks one. */
    allowedTypes: string[];
    optional: boolean;
    submission: ListingDocumentSubmissionDto | null;
  }>;
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface AdminSubmittedListing {
  id: string;
  title: string;
  surveyLabel: string;
  location: string;
  areaDescription: string;
  landCategory: string;
  status: string;
  landOwnerGoogleId: string;
  docCount: number;
  cumulativeScore: number | null;
  scoredDocCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminListingDocsResponse {
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  landOwnerGoogleId: string;
  cumulativeScore: number | null;
  scoredDocCount: number;
  totalDocs: number;
  /** Next document in catalog order that still needs a decision (pending). */
  firstPendingDocumentKey: string | null;
  docs: ListingDocumentSubmissionDto[];
}

export interface ScoreDocumentPayload {
  score: number;
  note?: string;
}

export interface ScoreDocumentResponse {
  doc: ListingDocumentSubmissionDto;
  cumulativeScore: number | null;
  scoredDocCount: number;
  totalDocs: number;
}

export interface ReviewDocumentPayload {
  action: 'approve' | 'reject';
  /** Defaults to the predicted score, or 80 when no prediction exists. */
  score?: number;
  /** Required for reject (min 3 chars). Optional on approve. */
  note?: string;
}

export interface ReviewDocumentResponse {
  doc: ListingDocumentSubmissionDto;
  cumulativeScore: number | null;
  scoredDocCount: number;
  totalDocs: number;
  nextPendingDocumentKey: string | null;
  firstPendingDocumentKey: string | null;
  listingStatus: string;
}

/** Public marketplace (no auth) — submitted + reviewed listings only. */
export interface MarketplaceListing {
  id: string;
  title: string;
  surveyLabel: string;
  location: string;
  areaDescription: string;
  landCategory: string;
  description: string;
  status: string;
  cumulativeScore: number | null;
  scoredDocCount: number;
  updatedAt?: string;
}

export interface PublicListingCategoryScore {
  documentKey: string;
  category: string;
  optional: boolean;
  score: number | null;
  reviewStatus: ListingDocumentReviewStatus | null;
}

export interface PublicListingDetailResponse {
  listing: {
    id: string;
    title: string;
    surveyLabel: string;
    location: string;
    areaDescription: string;
    landCategory: string;
    description: string;
    status: string;
    cumulativeScore: number | null;
    scoredRequiredCount: number;
    requiredCategoryCount: number;
    updatedAt?: string;
  };
  categoryScores: PublicListingCategoryScore[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});

const parseJson = async <T>(response: Response): Promise<T> => {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed.');
  }
  return data;
};

// ─── Land-owner API ───────────────────────────────────────────────────────────

export const createLandListing = async (
  token: string,
  payload: CreateListingPayload,
): Promise<{ listing: CreatedListing }> => {
  const response = await fetch(`${API_BASE_URL}/api/listings`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<{ listing: CreatedListing }>(response);
};

export const fetchMyListings = async (token: string): Promise<{ listings: MyListing[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/mine`, {
    headers: authHeaders(token),
  });
  return parseJson<{ listings: MyListing[] }>(response);
};

/** Browse published listings (marketplace + deal room hub). No auth. */
export const fetchMarketplaceListings = async (): Promise<{ listings: MarketplaceListing[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/public`);
  return parseJson<{ listings: MarketplaceListing[] }>(response);
};

/** Public detail for a single listing (KYL breakdown, no owner PII). */
export const fetchPublicListingDetail = async (
  listingId: string,
): Promise<PublicListingDetailResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/listings/public/${encodeURIComponent(listingId)}`,
  );
  return parseJson<PublicListingDetailResponse>(response);
};

export const fetchLandListing = async (
  token: string,
  listingId: string,
): Promise<{ listing: CreatedListing }> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}`, {
    headers: authHeaders(token),
  });
  return parseJson<{ listing: CreatedListing }>(response);
};

/** Submit draft listing for admin KYL review (requires all required documents uploaded). */
export const submitListingForReview = async (
  token: string,
  listingId: string,
): Promise<{ listing: CreatedListing }> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/submit`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return parseJson<{ listing: CreatedListing }>(response);
};

export const fetchListingDocuments = async (
  token: string,
  listingId: string,
): Promise<ListingDocumentsResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/documents`, {
    headers: authHeaders(token),
  });
  return parseJson<ListingDocumentsResponse>(response);
};

export const uploadListingDocument = async (
  token: string,
  listingId: string,
  documentKey: string,
  selectedType: string,
  file: File,
): Promise<{
  submission: ListingDocumentSubmissionDto;
  totalUploaded: number;
  listingStatus: string;
  cumulativeScore: number | null;
  scoredDocCount: number;
  predictedKylScore: number | null;
  predictedScoredDocCount: number;
}> => {
  const body = new FormData();
  body.append('documentKey', documentKey);
  body.append('selectedType', selectedType);
  body.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/documents/upload`, {
    method: 'POST',
    headers: authHeaders(token),
    body,
  });
  return parseJson<{
    submission: ListingDocumentSubmissionDto;
    totalUploaded: number;
    listingStatus: string;
    cumulativeScore: number | null;
    scoredDocCount: number;
    predictedKylScore: number | null;
    predictedScoredDocCount: number;
  }>(response);
};

export const openListingDocumentFile = async (
  token: string,
  listingId: string,
  documentKey: string,
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/api/listings/${listingId}/documents/file/${encodeURIComponent(documentKey)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Could not open file.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// ─── Admin API ────────────────────────────────────────────────────────────────

export const fetchAdminSubmittedListings = async (
  token: string,
): Promise<{ listings: AdminSubmittedListing[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/admin/submitted`, {
    headers: authHeaders(token),
  });
  return parseJson<{ listings: AdminSubmittedListing[] }>(response);
};

export const fetchAdminListingDocs = async (
  token: string,
  listingId: string,
): Promise<AdminListingDocsResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/listings/admin/${listingId}/docs`, {
    headers: authHeaders(token),
  });
  return parseJson<AdminListingDocsResponse>(response);
};

export const openAdminListingDocumentFile = async (
  token: string,
  listingId: string,
  documentKey: string,
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/api/listings/admin/${listingId}/docs/file/${encodeURIComponent(documentKey)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Could not open file.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const scoreListingDocument = async (
  token: string,
  listingId: string,
  documentKey: string,
  payload: ScoreDocumentPayload,
): Promise<ScoreDocumentResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/listings/admin/${listingId}/docs/${encodeURIComponent(documentKey)}/score`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJson<ScoreDocumentResponse>(response);
};

/** Single-step approve (with score) or reject (with mandatory note). */
export const reviewListingDocument = async (
  token: string,
  listingId: string,
  documentKey: string,
  payload: ReviewDocumentPayload,
): Promise<ReviewDocumentResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/listings/admin/${listingId}/docs/${encodeURIComponent(documentKey)}/review`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJson<ReviewDocumentResponse>(response);
};
