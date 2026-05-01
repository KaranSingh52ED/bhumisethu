import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminSubmittedListings,
  fetchAdminListingDocs,
  openAdminListingDocumentFile,
  reviewListingDocument,
  type AdminSubmittedListing,
  type AdminListingDocsResponse,
  type ListingDocumentSubmissionDto,
  type ListingDocumentReviewStatus,
} from '../lib/listingsApi';

interface Props {
  token: string;
}

interface ListingDocsState {
  loading: boolean;
  data: AdminListingDocsResponse | null;
  error: string;
}

const statusLabel = (st: ListingDocumentReviewStatus): string => {
  switch (st) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending';
  }
};

export function AdminListingReviewSection({ token }: Props) {
  const [listings, setListings] = useState<AdminSubmittedListing[]>([]);
  const [listError, setListError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [docsState, setDocsState] = useState<Record<string, ListingDocsState>>({});
  /** Which document key is active for the review panel (per expanded listing). */
  const [focusDocKey, setFocusDocKey] = useState<Record<string, string | null>>({});
  const [approveScore, setApproveScore] = useState<Record<string, string>>({});
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [busyListingId, setBusyListingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const loadListings = useCallback(async () => {
    setListError('');
    try {
      const res = await fetchAdminSubmittedListings(token);
      setListings(res.listings);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load listings.');
    }
  }, [token]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const toggleListing = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (docsState[id]?.data) return;

    setDocsState((prev) => ({ ...prev, [id]: { loading: true, data: null, error: '' } }));
    try {
      const data = await fetchAdminListingDocs(token, id);
      setDocsState((prev) => ({ ...prev, [id]: { loading: false, data, error: '' } }));
      const first =
        data.firstPendingDocumentKey ??
        data.docs.find((d) => d.reviewStatus === 'pending')?.id ??
        null;
      const firstDoc = data.docs.find((d) => d.id === first) ?? null;
      setFocusDocKey((prev) => ({ ...prev, [id]: first }));
      setApproveScore((prev) => ({
        ...prev,
        [id]: firstDoc?.predictedScore != null ? String(firstDoc.predictedScore) : '80',
      }));
      setRejectNote((prev) => ({ ...prev, [id]: '' }));
    } catch (e) {
      setDocsState((prev) => ({
        ...prev,
        [id]: { loading: false, data: null, error: e instanceof Error ? e.message : 'Failed.' },
      }));
    }
  };

  const mergeReviewResponse = (
    listingId: string,
    res: Awaited<ReturnType<typeof reviewListingDocument>>,
  ) => {
    const nextDoc =
      docsState[listingId]?.data?.docs.find((d) => d.id === res.nextPendingDocumentKey) ?? null;
    setDocsState((prev) => {
      const existing = prev[listingId];
      if (!existing?.data) return prev;
      return {
        ...prev,
        [listingId]: {
          ...existing,
          data: {
            ...existing.data,
            cumulativeScore: res.cumulativeScore,
            scoredDocCount: res.scoredDocCount,
            listingStatus: res.listingStatus,
            firstPendingDocumentKey: res.firstPendingDocumentKey,
            docs: existing.data.docs.map((d) => (d.id === res.doc.id ? res.doc : d)),
          },
        },
      };
    });
    setListings((prev) =>
      prev.map((l) =>
        l.id === listingId
          ? {
              ...l,
              cumulativeScore: res.cumulativeScore,
              scoredDocCount: res.scoredDocCount,
              status: res.listingStatus,
            }
          : l,
      ),
    );
    setFocusDocKey((prev) => ({ ...prev, [listingId]: res.nextPendingDocumentKey }));
    setApproveScore((prev) => ({
      ...prev,
      [listingId]: nextDoc?.predictedScore != null ? String(nextDoc.predictedScore) : '80',
    }));
    setRejectNote((prev) => ({ ...prev, [listingId]: '' }));
  };

  const handleApprove = async (listingId: string, doc: ListingDocumentSubmissionDto) => {
    const raw = approveScore[listingId] ?? '80';
    const scoreNum = Number(raw);
    if (raw === '' || Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setActionError('Enter a score from 0 to 100 (default 80).');
      return;
    }
    setBusyListingId(listingId);
    setActionError('');
    try {
      const res = await reviewListingDocument(token, listingId, doc.id, {
        action: 'approve',
        score: scoreNum,
      });
      mergeReviewResponse(listingId, res);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed.');
    } finally {
      setBusyListingId(null);
    }
  };

  const handleReject = async (listingId: string, doc: ListingDocumentSubmissionDto) => {
    const note = (rejectNote[listingId] ?? '').trim();
    if (note.length < 3) {
      setActionError('Rejection requires a note (at least 3 characters) for the landowner.');
      return;
    }
    setBusyListingId(listingId);
    setActionError('');
    try {
      const res = await reviewListingDocument(token, listingId, doc.id, {
        action: 'reject',
        note,
      });
      mergeReviewResponse(listingId, res);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reject failed.');
    } finally {
      setBusyListingId(null);
    }
  };

  const scoreColor = (score: number | null) => {
    if (score == null) return 'var(--muted)';
    if (score >= 75) return '#2e8b57';
    if (score >= 50) return '#b07c10';
    return 'var(--terracotta)';
  };

  return (
    <section
      id="listing-kyl-review"
      className="admin-kyl-section"
      aria-labelledby="admin-kyl-heading"
    >
      <div className="admin-kyl-hero">
        <h2 id="admin-kyl-heading" className="admin-kyl-hero__title">
          Listing KYL review
        </h2>
        <p className="admin-kyl-hero__lead">
          Open a listing to review documents one at a time. <strong>Approve</strong> assigns a score
          (defaults to 80); <strong>Reject</strong> requires a note that is sent to the landowner.
          After each action, the queue moves to the next pending document automatically.
        </p>
      </div>

      <div className="dash-card admin-kyl-card">
        <div className="dash-card-header">
          <div className="dash-card-title">Submissions queue</div>
          <button type="button" className="dash-card-action" onClick={() => void loadListings()}>
            Refresh
          </button>
        </div>
        <div className="dash-card-body">
          {listError ? <p className="admin-kyl-error">{listError}</p> : null}
          {listings.length === 0 ? (
            <p className="admin-kyl-empty">No listings in submitted or reviewed status yet.</p>
          ) : (
            <div className="admin-kyl-queue">
              {listings.map((listing) => {
                const isOpen = expanded === listing.id;
                const ds = docsState[listing.id];
                const focusKey = focusDocKey[listing.id];
                const focusedDoc = ds?.data?.docs.find((d) => d.id === focusKey) ?? null;
                const busy = busyListingId === listing.id;

                return (
                  <div
                    key={listing.id}
                    className={`admin-kyl-item${isOpen ? ' admin-kyl-item--open' : ''}`}
                  >
                    <button
                      type="button"
                      className="admin-kyl-item__header"
                      onClick={() => void toggleListing(listing.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="admin-kyl-item__main">
                        <span className="admin-kyl-item__title">{listing.title}</span>
                        <span className="admin-kyl-item__meta">
                          {listing.location} · {listing.landCategory} · {listing.surveyLabel}
                        </span>
                      </span>
                      <span className="admin-kyl-item__stat">
                        {listing.docCount} file{listing.docCount !== 1 ? 's' : ''}
                      </span>
                      {listing.cumulativeScore != null ? (
                        <span
                          className="admin-kyl-item__score"
                          style={{ color: scoreColor(listing.cumulativeScore) }}
                        >
                          KYL {listing.cumulativeScore}
                          <span className="admin-kyl-item__score-sub">
                            {' '}
                            ({listing.scoredDocCount} required scored)
                          </span>
                        </span>
                      ) : (
                        <span className="admin-kyl-item__pending">Not scored</span>
                      )}
                      <span
                        className={`admin-kyl-badge admin-kyl-badge--${listing.status === 'reviewed' ? 'done' : 'active'}`}
                      >
                        {listing.status === 'reviewed' ? 'Complete' : 'In review'}
                      </span>
                      <span className="admin-kyl-item__chev" aria-hidden>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="admin-kyl-item__panel">
                        {actionError ? <p className="admin-kyl-error">{actionError}</p> : null}
                        {ds?.loading ? (
                          <p className="admin-kyl-loading">Loading documents…</p>
                        ) : ds?.error ? (
                          <p className="admin-kyl-error">{ds.error}</p>
                        ) : ds?.data ? (
                          <>
                            {ds.data.cumulativeScore != null ? (
                              <div className="admin-kyl-cumulative">
                                <strong>Cumulative KYL</strong>
                                <span className="admin-kyl-cumulative__val">
                                  {ds.data.cumulativeScore}
                                </span>
                                <span className="admin-kyl-cumulative__hint">
                                  — {ds.data.scoredDocCount} required categories approved ·{' '}
                                  {ds.data.totalDocs} file{ds.data.totalDocs !== 1 ? 's' : ''}{' '}
                                  uploaded
                                </span>
                              </div>
                            ) : null}

                            {ds.data.docs.length === 0 ? (
                              <p className="admin-kyl-empty">No documents uploaded.</p>
                            ) : (
                              <>
                                {focusedDoc && focusedDoc.reviewStatus === 'pending' ? (
                                  <div className="admin-kyl-review-focus">
                                    <div className="admin-kyl-review-focus__head">
                                      <strong>Reviewing</strong>
                                      <span className="admin-kyl-review-focus__cat">
                                        {focusedDoc.category} · {focusedDoc.typeLabel}
                                      </span>
                                    </div>
                                    <p className="admin-kyl-doc__file">
                                      {focusedDoc.originalFileName}
                                    </p>
                                    {focusedDoc.predictedScore != null ? (
                                      <p className="admin-kyl-doc__badge">
                                        Predicted score: {focusedDoc.predictedScore}/100
                                      </p>
                                    ) : null}
                                    <div className="admin-kyl-review-focus__row">
                                      <button
                                        type="button"
                                        className="btn-ghost btn-ghost--sm"
                                        disabled={busy}
                                        onClick={() =>
                                          void openAdminListingDocumentFile(
                                            token,
                                            listing.id,
                                            focusedDoc.id,
                                          )
                                        }
                                      >
                                        Open file
                                      </button>
                                      <div className="admin-kyl-field">
                                        <label htmlFor={`approve-score-${listing.id}`}>
                                          Score (approve)
                                        </label>
                                        <input
                                          id={`approve-score-${listing.id}`}
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="admin-kyl-input"
                                          value={approveScore[listing.id] ?? '80'}
                                          onChange={(ev) =>
                                            setApproveScore((p) => ({
                                              ...p,
                                              [listing.id]: ev.target.value,
                                            }))
                                          }
                                          disabled={busy}
                                          aria-label={`Approval score for ${focusedDoc.category}`}
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        className="btn-primary btn-primary--sm"
                                        disabled={busy}
                                        onClick={() => void handleApprove(listing.id, focusedDoc)}
                                      >
                                        {busy ? 'Working…' : 'Approve'}
                                      </button>
                                    </div>
                                    <div className="admin-kyl-review-focus__reject">
                                      <label htmlFor={`reject-note-${listing.id}`}>
                                        Rejection note (required if you reject)
                                      </label>
                                      <textarea
                                        id={`reject-note-${listing.id}`}
                                        className="admin-kyl-input admin-kyl-textarea"
                                        rows={2}
                                        value={rejectNote[listing.id] ?? ''}
                                        onChange={(ev) =>
                                          setRejectNote((p) => ({
                                            ...p,
                                            [listing.id]: ev.target.value,
                                          }))
                                        }
                                        disabled={busy}
                                        placeholder="Explain what is wrong so the landowner can fix it."
                                      />
                                      <button
                                        type="button"
                                        className="btn-ghost btn-ghost--sm admin-kyl-reject-btn"
                                        disabled={busy}
                                        onClick={() => void handleReject(listing.id, focusedDoc)}
                                      >
                                        Reject with note
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="admin-kyl-review-done">
                                    {ds.data.firstPendingDocumentKey == null
                                      ? 'All uploaded documents have been reviewed, or none are pending.'
                                      : 'Select a pending document below to continue.'}
                                  </p>
                                )}

                                <ul className="admin-kyl-doc-list">
                                  {ds.data.docs.map((doc) => {
                                    const isFocus = doc.id === focusKey;
                                    return (
                                      <li key={doc.id}>
                                        <button
                                          type="button"
                                          className={`admin-kyl-doc admin-kyl-doc--select${isFocus ? ' admin-kyl-doc--focus' : ''}`}
                                          onClick={() => {
                                            setFocusDocKey((p) => ({ ...p, [listing.id]: doc.id }));
                                            setApproveScore((p) => ({
                                              ...p,
                                              [listing.id]:
                                                doc.adminScore != null
                                                  ? String(doc.adminScore)
                                                  : doc.predictedScore != null
                                                    ? String(doc.predictedScore)
                                                    : '80',
                                            }));
                                            setRejectNote((p) => ({ ...p, [listing.id]: '' }));
                                            setActionError('');
                                          }}
                                        >
                                          <div className="admin-kyl-doc__head">
                                            <div>
                                              <strong className="admin-kyl-doc__type">
                                                {doc.typeLabel}
                                              </strong>
                                              <span className="admin-kyl-doc__cat">
                                                {' '}
                                                · {doc.category}
                                              </span>
                                            </div>
                                            <span
                                              className={`admin-kyl-doc__status admin-kyl-doc__status--${doc.reviewStatus}`}
                                            >
                                              {statusLabel(doc.reviewStatus)}
                                            </span>
                                          </div>
                                          <p className="admin-kyl-doc__file">
                                            {doc.originalFileName}
                                          </p>
                                          {doc.reviewStatus === 'approved' &&
                                          doc.adminScore != null ? (
                                            <p
                                              className="admin-kyl-doc__badge"
                                              style={{ color: scoreColor(doc.adminScore) }}
                                            >
                                              Score {doc.adminScore}/100
                                            </p>
                                          ) : doc.predictedScore != null ? (
                                            <p className="admin-kyl-doc__badge">
                                              Predicted {doc.predictedScore}/100
                                            </p>
                                          ) : null}
                                          {doc.reviewStatus === 'rejected' && doc.adminNote ? (
                                            <p className="admin-kyl-doc__note">
                                              Note to landowner: {doc.adminNote}
                                            </p>
                                          ) : null}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </>
                            )}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
