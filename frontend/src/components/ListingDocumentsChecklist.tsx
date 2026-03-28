import { useCallback, useEffect, useState } from 'react';
import {
  fetchListingDocuments,
  openListingDocumentFile,
  uploadListingDocument,
  type ListingDocumentsResponse,
} from '../lib/listingsApi';

interface Props {
  token: string;
  listingId: string;
}

export function ListingDocumentsChecklist({ token, listingId }: Props) {
  const [data, setData] = useState<ListingDocumentsResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  // Per-category selected type — pre-populated from existing submissions or first allowed type.
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetchListingDocuments(token, listingId);
      setData(res);
      setError('');
      // Initialise type selections: prefer the already-uploaded type, else first allowed type.
      setSelectedTypes((prev) => {
        const next: Record<string, string> = {};
        for (const item of res.items) {
          next[item.documentKey] =
            prev[item.documentKey] ?? item.submission?.typeLabel ?? item.allowedTypes[0] ?? '';
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents.');
    }
  }, [token, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFileChange = async (documentKey: string, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    const chosenType = selectedTypes[documentKey];
    if (!chosenType) {
      setError('Please select a document type before uploading.');
      return;
    }

    setUploadingKey(documentKey);
    setError('');
    try {
      const result = await uploadListingDocument(token, listingId, documentKey, chosenType, file);
      // Optimistically update listing status if the backend auto-submitted.
      setData((prev) => (prev ? { ...prev, totalUploaded: result.totalUploaded } : prev));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploadingKey(null);
    }
  };

  if (!data) {
    return (
      <div className="listing-doc-checklist listing-doc-checklist--loading">
        Loading document checklist…
      </div>
    );
  }

  const requiredTotal = data.items.filter((i) => !i.optional).length;
  const requiredDone = data.items.filter((i) => !i.optional && i.submission).length;
  const isSubmitted = data.listingStatus === 'submitted';

  return (
    <div className="listing-doc-checklist">
      <div className="listing-doc-checklist__head">
        <h2 className="listing-doc-checklist__title">Listing documents</h2>
        <p className="listing-doc-checklist__progress">
          One document per category. Required:{' '}
          <strong>
            {requiredDone} / {requiredTotal}
          </strong>{' '}
          · Total uploaded: {data.totalUploaded}
        </p>
      </div>

      {isSubmitted ? (
        <div className="listing-doc-checklist__submitted">
          <span className="listing-doc-checklist__submitted-icon">✓</span>
          <div>
            <strong>Submitted for admin review</strong>
            <p>
              This listing was sent from the review step. Admins will score your KYL documents. You
              may still replace files if needed.
            </p>
          </div>
        </div>
      ) : (
        <div className="listing-doc-checklist__draft-note">
          <p>
            Uploads save as you go. When every required category has a file, go to{' '}
            <strong>Step 3 · Review</strong> and use <strong>Submit for admin review</strong>—your
            listing is not queued for admins until then.
          </p>
        </div>
      )}

      {error ? <p className="listing-doc-checklist__error">{error}</p> : null}

      <ul className="listing-doc-checklist__list" role="list">
        {data.items.map((row) => {
          const sub = row.submission;
          const busy = uploadingKey === row.documentKey;
          const hasSingleType = row.allowedTypes.length === 1;
          const reviewState =
            sub?.reviewStatus ?? (sub?.adminScore != null ? 'approved' : 'pending');

          return (
            <li key={row.documentKey} className="listing-doc-card">
              <div className="listing-doc-card__main">
                <div className="listing-doc-card__meta">
                  <span className="listing-doc-card__category">{row.category}</span>
                  {row.optional ? (
                    <span className="listing-doc-card__optional">Optional</span>
                  ) : null}
                  {sub ? (
                    reviewState === 'rejected' ? (
                      <span className="listing-doc-card__status--rejected">Rejected</span>
                    ) : reviewState === 'approved' ? (
                      <span className="listing-doc-card__status--ok">
                        ✓ Reviewed{sub.adminScore != null ? ` (${sub.adminScore}/100)` : ''}
                      </span>
                    ) : (
                      <span className="listing-doc-card__status--warn">Awaiting admin review</span>
                    )
                  ) : (
                    <span className="listing-doc-card__status--pending">Pending upload</span>
                  )}
                </div>

                {sub ? (
                  <p className="listing-doc-card__uploaded-info">
                    <strong>{sub.typeLabel}</strong> — {sub.originalFileName}
                  </p>
                ) : null}

                {reviewState === 'rejected' && sub?.adminNote ? (
                  <div className="listing-doc-card__reject-note" role="status">
                    <strong>Reviewer feedback</strong>
                    <p>{sub.adminNote}</p>
                  </div>
                ) : null}

                {/* Type selector — shown as static label when only one option exists */}
                {hasSingleType ? (
                  <p className="listing-doc-card__type-label">{row.allowedTypes[0]}</p>
                ) : (
                  <div className="listing-doc-card__type-row">
                    <label
                      htmlFor={`type-${row.documentKey}`}
                      className="listing-doc-card__type-selector-label"
                    >
                      Document type:
                    </label>
                    <select
                      id={`type-${row.documentKey}`}
                      className="listing-doc-card__type-select"
                      value={selectedTypes[row.documentKey] ?? ''}
                      onChange={(e) =>
                        setSelectedTypes((prev) => ({
                          ...prev,
                          [row.documentKey]: e.target.value,
                        }))
                      }
                      disabled={busy || uploadingKey !== null}
                    >
                      {row.allowedTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="listing-doc-card__actions">
                <label className="listing-doc-card__upload-label">
                  {busy ? 'Uploading…' : sub ? 'Replace file' : 'Choose file'}
                  <input
                    type="file"
                    className="listing-doc-card__file"
                    accept=".pdf,image/*"
                    disabled={uploadingKey !== null}
                    onChange={(ev) => void onFileChange(row.documentKey, ev.target.files)}
                  />
                </label>
                {sub ? (
                  <button
                    type="button"
                    className="listing-doc-card__view"
                    onClick={() => void openListingDocumentFile(token, listingId, sub.documentKey)}
                  >
                    View
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
