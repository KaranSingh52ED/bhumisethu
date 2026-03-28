const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export interface CatalogDocumentEntry {
  documentKey: string;
  category: string;
  description?: string;
  group?: string;
  groupLabel?: string;
  sortOrder?: number;
  /** Accepted type labels — owner picks one per upload. */
  allowedTypes: string[];
  optional: boolean;
}

export interface DocumentSubmissionDto {
  id: string;
  documentKey: string;
  category: string;
  typeLabel: string;
  optional: boolean;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  adminScore: number | null;
  adminNote: string;
  reviewedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LandOwnerDocumentsResponse {
  cumulativeAverageScore: number | null;
  scoredApprovedCount: number;
  totalUploaded: number;
  items: Array<CatalogDocumentEntry & { submission: DocumentSubmissionDto | null }>;
}

export interface AdminPendingSubmission extends DocumentSubmissionDto {
  landOwnerGoogleId: string;
}

const authHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});

export const fetchDocumentCatalog = async (): Promise<CatalogDocumentEntry[]> => {
  const res = await fetch(`${API_BASE_URL}/api/land-documents/catalog`);
  const data = (await res.json()) as { documents?: CatalogDocumentEntry[]; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Failed to load document catalog.');
  }
  return data.documents ?? [];
};

export const fetchMyLandDocuments = async (token: string): Promise<LandOwnerDocumentsResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/land-documents/my`, {
    headers: authHeaders(token),
  });
  const data = (await res.json()) as LandOwnerDocumentsResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Failed to load your documents.');
  }
  return data;
};

export const uploadLandDocument = async (
  token: string,
  documentKey: string,
  selectedType: string,
  file: File,
): Promise<{
  submission: DocumentSubmissionDto;
  cumulativeAverageScore: number | null;
  scoredApprovedCount: number;
}> => {
  const body = new FormData();
  body.append('documentKey', documentKey);
  body.append('selectedType', selectedType);
  body.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/land-documents/upload`, {
    method: 'POST',
    headers: authHeaders(token),
    body,
  });
  const data = (await res.json()) as {
    submission?: DocumentSubmissionDto;
    cumulativeAverageScore?: number | null;
    scoredApprovedCount?: number;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? 'Upload failed.');
  }
  if (!data.submission) {
    throw new Error('Invalid upload response.');
  }
  return {
    submission: data.submission,
    cumulativeAverageScore: data.cumulativeAverageScore ?? null,
    scoredApprovedCount: data.scoredApprovedCount ?? 0,
  };
};

export const openLandDocumentFile = async (token: string, submissionId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/land-documents/file/${submissionId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Could not open file.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const fetchAdminPendingDocuments = async (
  token: string,
): Promise<AdminPendingSubmission[]> => {
  const res = await fetch(`${API_BASE_URL}/api/land-documents/admin/pending`, {
    headers: authHeaders(token),
  });
  const data = (await res.json()) as { submissions?: AdminPendingSubmission[]; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Failed to load pending documents.');
  }
  return data.submissions ?? [];
};

export const reviewLandDocument = async (
  token: string,
  submissionId: string,
  payload: { status: 'approved' | 'rejected'; score?: number; note?: string },
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/land-documents/admin/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? 'Review failed.');
  }
};
