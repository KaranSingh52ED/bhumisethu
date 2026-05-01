import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchListingDocuments,
  fetchMyListings,
  openListingDocumentFile,
  type ListingDocumentsResponse,
  type ListingDocumentSubmissionDto,
  type MyListing,
} from '../lib/listingsApi';

interface Props {
  token: string;
}

type ListingDocsBundle = {
  listing: MyListing;
  data: ListingDocumentsResponse | null;
  error: string;
};

function submissionReviewLabel(sub: ListingDocumentSubmissionDto | null): string {
  if (!sub) return 'Not uploaded';
  const rs =
    sub.reviewStatus ??
    (sub.adminScore != null && sub.adminScore !== undefined ? 'approved' : 'pending');
  if (rs === 'rejected') return 'Rejected';
  if (rs === 'approved') return 'Approved';
  return 'Pending review';
}

function statusClass(sub: ListingDocumentSubmissionDto | null): string {
  if (!sub) return 'profile-lkyl-status--empty';
  const rs =
    sub.reviewStatus ??
    (sub.adminScore != null && sub.adminScore !== undefined ? 'approved' : 'pending');
  if (rs === 'rejected') return 'profile-lkyl-status--rejected';
  if (rs === 'approved') return 'profile-lkyl-status--approved';
  return 'profile-lkyl-status--pending';
}

export function ProfileListingKylSection({ token }: Props) {
  const [bundles, setBundles] = useState<ListingDocsBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState('');

  const load = useCallback(async () => {
    setFatalError('');
    setLoading(true);
    try {
      const { listings } = await fetchMyListings(token);
      const next: ListingDocsBundle[] = [];
      for (const listing of listings) {
        try {
          const data = await fetchListingDocuments(token, listing.id);
          next.push({ listing, data, error: '' });
        } catch (e) {
          next.push({
            listing,
            data: null,
            error: e instanceof Error ? e.message : 'Could not load documents.',
          });
        }
      }
      setBundles(next);
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : 'Could not load listings.');
      setBundles([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-card profile-listing-kyl-wrap">
        <div className="dash-card-body">
          <p className="profile-kyl-locked" style={{ margin: 0 }}>
            Loading listing KYL status…
          </p>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="dash-card profile-listing-kyl-wrap">
        <div className="dash-card-header">
          <div className="dash-card-title">Listing parcels (KYL)</div>
        </div>
        <div className="dash-card-body">
          <p className="profile-kyl-locked" style={{ margin: 0, color: 'var(--terracotta)' }}>
            {fatalError}
          </p>
        </div>
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <div className="dash-card profile-listing-kyl-wrap">
        <div className="dash-card-header">
          <div className="dash-card-title">Listing parcels (KYL)</div>
        </div>
        <div className="dash-card-body">
          <p className="profile-kyl-locked" style={{ margin: 0 }}>
            You do not have any land listings yet. <Link to="/listings/new">Create a listing</Link>{' '}
            to upload parcel documents and track admin review here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-listing-kyl-wrap">
      <div className="profile-listing-kyl-intro">
        <h2 className="profile-listing-kyl-heading">Listing parcels (KYL)</h2>
        <p className="profile-kyl-locked" style={{ margin: 0 }}>
          Verification status and scores for each document category, per listing. Scores apply after
          an admin approves the category.
        </p>
      </div>

      {bundles.map(({ listing, data, error }) => (
        <div key={listing.id} className="dash-card profile-listing-kyl-card">
          <div className="dash-card-header profile-listing-kyl-card-hd">
            <div>
              <div className="dash-card-title">{listing.title}</div>
              <div className="profile-listing-kyl-meta">
                {listing.surveyLabel} · {listing.location} · {listing.landCategory}
              </div>
            </div>
            <div className="profile-listing-kyl-card-actions">
              <span
                className={`profile-badge profile-listing-ls profile-listing-ls--${listing.status}`}
              >
                {listing.status === 'draft'
                  ? 'Draft'
                  : listing.status === 'submitted'
                    ? 'Submitted'
                    : listing.status === 'reviewed'
                      ? 'Reviewed'
                      : listing.status}
              </span>
              {data ? (
                <span className="profile-listing-kyl-agg">
                  Avg. KYL {data.cumulativeScore != null ? data.cumulativeScore : '—'} · Expected{' '}
                  {data.predictedKylScore != null ? `${data.predictedKylScore}/100` : '—'} ·{' '}
                  {data.scoredDocCount} of {data.kylRequiredTotal ?? '—'} required approved
                </span>
              ) : null}
              <Link
                to={`/listings/new?listingId=${encodeURIComponent(listing.id)}&step=2`}
                className="dash-card-action"
              >
                Manage uploads
              </Link>
            </div>
          </div>

          {error ? (
            <div className="dash-card-body">
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--terracotta)' }}>{error}</p>
            </div>
          ) : data ? (
            <div className="dash-card-body" style={{ paddingTop: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="profile-lkyl-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Document type</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Note</th>
                      <th>File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => {
                      const sub = row.submission;
                      return (
                        <tr key={row.documentKey}>
                          <td>
                            {row.category}
                            {row.optional ? (
                              <span style={{ color: 'var(--muted)', marginLeft: 4 }}>(opt.)</span>
                            ) : null}
                          </td>
                          <td>{sub?.typeLabel ?? '—'}</td>
                          <td>
                            <span className={`profile-lkyl-status ${statusClass(sub)}`}>
                              {submissionReviewLabel(sub)}
                            </span>
                          </td>
                          <td>
                            {sub?.reviewStatus === 'approved' && sub.adminScore != null
                              ? sub.adminScore
                              : sub?.predictedScore != null
                                ? `${sub.predictedScore} predicted`
                                : '—'}
                          </td>
                          <td className="profile-lkyl-note-cell">
                            {sub?.reviewStatus === 'rejected' && sub.adminNote
                              ? sub.adminNote
                              : '—'}
                          </td>
                          <td>
                            {sub ? (
                              <button
                                type="button"
                                className="dash-card-action"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                onClick={() =>
                                  void openListingDocumentFile(token, listing.id, sub.documentKey)
                                }
                              >
                                View
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
