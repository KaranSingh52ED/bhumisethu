import { useCallback, useEffect, useState } from 'react';
import {
  fetchLandListing,
  fetchListingDocuments,
  submitListingForReview,
  type CreatedListing,
  type ListingDocumentsResponse,
} from '../lib/listingsApi';

interface Props {
  token: string;
  listingId: string;
  onSubmitted: (listing: CreatedListing) => void;
  onBack: () => void;
}

export function ListingReviewStep({ token, listingId, onSubmitted, onBack }: Props) {
  const [listing, setListing] = useState<CreatedListing | null>(null);
  const [docs, setDocs] = useState<ListingDocumentsResponse | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [lr, dr] = await Promise.all([
        fetchLandListing(token, listingId),
        fetchListingDocuments(token, listingId),
      ]);
      setListing(lr.listing);
      setDocs(dr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listing.');
    }
  }, [token, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await submitListingForReview(token, listingId);
      onSubmitted(res.listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!listing || !docs) {
    return (
      <div className="listing-review listing-review--loading">
        <p>Loading review…</p>
      </div>
    );
  }

  const requiredTotal = docs.items.filter((i) => !i.optional).length;
  const requiredDone = docs.items.filter((i) => !i.optional && i.submission).length;
  const canSubmit = listing.status === 'draft' && requiredDone >= requiredTotal;

  return (
    <div className="listing-review">
      <div className="listing-review__head">
        <h2 className="listing-review__title">Step 3 · Review & submit</h2>
        <p className="listing-review__lead">
          Confirm your parcel details and documents. Nothing is sent to admins until you press{' '}
          <strong>Submit for admin review</strong>.
        </p>
      </div>

      {error ? <p className="listing-doc-checklist__error">{error}</p> : null}

      <section className="listing-review__section" aria-labelledby="review-parcel">
        <h3 id="review-parcel" className="listing-review__section-title">
          Parcel details
        </h3>
        <dl className="listing-review__dl">
          <div>
            <dt>Title</dt>
            <dd>{listing.title}</dd>
          </div>
          <div>
            <dt>Survey / plot</dt>
            <dd>{listing.surveyLabel}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{listing.location}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{listing.areaDescription}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{listing.landCategory}</dd>
          </div>
          {listing.description ? (
            <div className="listing-review__dl-full">
              <dt>Description</dt>
              <dd>{listing.description}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="listing-review__section" aria-labelledby="review-docs">
        <h3 id="review-docs" className="listing-review__section-title">
          Documents
        </h3>
        <p className="listing-review__progress">
          Required categories uploaded:{' '}
          <strong>
            {requiredDone} / {requiredTotal}
          </strong>{' '}
          · Total files: {docs.totalUploaded}
        </p>
        <ul className="listing-review__doc-list">
          {docs.items.map((row) => (
            <li key={row.documentKey} className="listing-review__doc-row">
              <span className="listing-review__doc-cat">{row.category}</span>
              {row.optional ? <span className="listing-doc-card__optional">Optional</span> : null}
              {row.submission ? (
                <span className="listing-review__doc-ok">
                  ✓ {row.submission.typeLabel} — {row.submission.originalFileName}
                </span>
              ) : (
                <span className="listing-review__doc-miss">
                  {row.optional ? '—' : 'Missing (required)'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="listing-review__actions">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>
          ← Back to documents
        </button>
        {listing.status === 'draft' ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => void onSubmit()}
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit for admin review'}
          </button>
        ) : (
          <p className="listing-review__already">
            This listing is already <strong>{listing.status}</strong>. No further action needed
            here.
          </p>
        )}
      </div>

      {listing.status === 'draft' && !canSubmit ? (
        <p className="listing-review__hint">
          Upload every required document in step 2 before you can submit.
        </p>
      ) : null}
    </div>
  );
}
