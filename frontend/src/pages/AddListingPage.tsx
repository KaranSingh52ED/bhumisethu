import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ListingDocumentsChecklist } from '../components/ListingDocumentsChecklist';
import { ListingReviewStep } from '../components/ListingReviewStep';
import { useAuth } from '../context/AuthContext';
import {
  createLandListing,
  fetchLandListing,
  type CreateListingPayload,
  type CreatedListing,
  type LandCategory,
} from '../lib/listingsApi';

const categories: { value: LandCategory; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'mixed', label: 'Mixed use' },
];

function ListingWizardSteps({ step }: { step: 1 | 2 | 3 }) {
  const Item = ({ n, label }: { n: 1 | 2 | 3; label: string }) => (
    <span
      className={
        'listing-wizard__step ' +
        (step === n ? 'listing-wizard__step--active ' : '') +
        (step > n ? 'listing-wizard__step--done' : '')
      }
    >
      {step > n ? '✓ ' : ''}
      Step {n} · {label}
    </span>
  );
  return (
    <nav className="listing-wizard" aria-label="Listing steps">
      <Item n={1} label="Parcel" />
      <span className="listing-wizard__sep" aria-hidden>
        →
      </span>
      <Item n={2} label="Documents" />
      <span className="listing-wizard__sep" aria-hidden>
        →
      </span>
      <Item n={3} label="Review" />
    </nav>
  );
}

export function AddListingPage() {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const docsAnchorRef = useRef<HTMLDivElement>(null);

  const listingId = searchParams.get('listingId');
  const rawStep = searchParams.get('step');
  const step: 1 | 2 | 3 = rawStep === '2' ? 2 : rawStep === '3' ? 3 : 1;

  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateListingPayload>({
    title: '',
    surveyLabel: '',
    location: '',
    areaDescription: '',
    landCategory: 'residential',
    description: '',
  });
  const [submittedListing, setSubmittedListing] = useState<CreatedListing | null>(null);

  useEffect(() => {
    setSubmittedListing(null);
  }, [listingId]);

  useEffect(() => {
    if ((step === 2 || step === 3) && !listingId) {
      setSearchParams({ step: '1' }, { replace: true });
    }
  }, [step, listingId, setSearchParams]);

  useEffect(() => {
    if (!listingId || step !== 1 || !token) return;
    let cancelled = false;
    void fetchLandListing(token, listingId)
      .then(({ listing }) => {
        if (cancelled) return;
        setForm({
          title: listing.title,
          surveyLabel: listing.surveyLabel,
          location: listing.location,
          areaDescription: listing.areaDescription,
          landCategory: listing.landCategory as LandCategory,
          description: listing.description ?? '',
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listingId, step, token]);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'land_owner') {
      navigate('/listings', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return <div className="reg-loading">Loading…</div>;
  }

  if (user.role !== 'land_owner') {
    return <Navigate to="/listings" replace />;
  }

  if (!user.isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!token) {
    return <div className="reg-loading">Session missing. Please sign in again.</div>;
  }

  const goToStep = (next: 1 | 2 | 3) => {
    const p = new URLSearchParams();
    if (listingId) p.set('listingId', listingId);
    p.set('step', String(next));
    setSearchParams(p);
    if (next === 2) {
      requestAnimationFrame(() => {
        docsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const onSubmitStep1 = async (e: FormEvent) => {
    e.preventDefault();
    if (listingId) return;
    setFormError('');
    setSubmitting(true);
    try {
      const { listing } = await createLandListing(token, {
        ...form,
        description: form.description?.trim() || '',
      });
      const p = new URLSearchParams();
      p.set('listingId', listing.id);
      p.set('step', '2');
      setSearchParams(p);
      requestAnimationFrame(() => {
        docsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create listing.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasListing = Boolean(listingId);

  return (
    <div className="listing-add-page">
      <div className="listing-add-inner">
        <div className="listing-add-breadcrumb">
          <Link to="/listings">← Back to listings</Link>
        </div>

        <div className="reg-step-badge" style={{ marginBottom: '0.5rem' }}>
          Land owner · New listing
        </div>
        <h1 className="listing-add-page-title">Add a land listing</h1>
        <p className="listing-add-lead">
          Three steps: save parcel details, upload KYL documents (saved as you go), then review and
          submit for admin scoring—only the final submit sends your listing to the queue.
        </p>

        <ListingWizardSteps step={step} />

        {step === 1 ? (
          <div className="reg-card" style={{ marginBottom: '2rem' }}>
            <div className="reg-card-hd">
              <h2 className="reg-title" style={{ fontSize: '1.35rem' }}>
                Step 1 · Parcel details
              </h2>
              {hasListing ? (
                <p className="reg-lead" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  Listing saved. Use the wizard or the button below to continue to documents.
                </p>
              ) : null}
            </div>
            <div className="reg-card-bd">
              <form className="reg-form" onSubmit={(ev) => void onSubmitStep1(ev)}>
                <div>
                  <label htmlFor="lst-title" className="reg-label">
                    Listing title
                  </label>
                  <input
                    id="lst-title"
                    className="reg-input"
                    required
                    minLength={3}
                    maxLength={200}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Survey 88 — Kompally, Hyderabad"
                    disabled={hasListing}
                  />
                </div>
                <div className="reg-grid-2">
                  <div>
                    <label htmlFor="lst-survey" className="reg-label">
                      Survey / plot reference
                    </label>
                    <input
                      id="lst-survey"
                      className="reg-input"
                      required
                      maxLength={120}
                      value={form.surveyLabel}
                      onChange={(e) => setForm((f) => ({ ...f, surveyLabel: e.target.value }))}
                      disabled={hasListing}
                    />
                  </div>
                  <div>
                    <label htmlFor="lst-area" className="reg-label">
                      Area (as you list it)
                    </label>
                    <input
                      id="lst-area"
                      className="reg-input"
                      required
                      maxLength={80}
                      value={form.areaDescription}
                      onChange={(e) => setForm((f) => ({ ...f, areaDescription: e.target.value }))}
                      placeholder="e.g. 4.2 acres"
                      disabled={hasListing}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lst-loc" className="reg-label">
                    Location
                  </label>
                  <input
                    id="lst-loc"
                    className="reg-input"
                    required
                    maxLength={200}
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Village, district, state"
                    disabled={hasListing}
                  />
                </div>
                <div>
                  <label htmlFor="lst-cat" className="reg-label">
                    Land category
                  </label>
                  <select
                    id="lst-cat"
                    className="reg-select"
                    required
                    value={form.landCategory}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, landCategory: e.target.value as LandCategory }))
                    }
                    disabled={hasListing}
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="lst-desc" className="reg-label">
                    Description (optional)
                  </label>
                  <textarea
                    id="lst-desc"
                    className="reg-textarea"
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={hasListing}
                    rows={4}
                  />
                </div>
                {formError ? <p className="reg-error">{formError}</p> : null}
                <div className="reg-actions">
                  {!hasListing ? (
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? 'Saving…' : 'Save & go to step 2'}
                    </button>
                  ) : (
                    <button type="button" className="btn-primary" onClick={() => goToStep(2)}>
                      Continue to step 2 · Documents
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <div ref={docsAnchorRef} tabIndex={-1} className="listing-add-docs-anchor">
          {step === 2 && listingId ? (
            <>
              <div className="reg-step-badge" style={{ marginBottom: '0.65rem' }}>
                Step 2 · Documents (upload before review)
              </div>
              <div className="reg-card">
                <div className="reg-card-bd" style={{ paddingTop: '1.5rem' }}>
                  <ListingDocumentsChecklist token={token} listingId={listingId} />
                  <div
                    className="reg-actions"
                    style={{
                      marginTop: '1.75rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <button type="button" className="btn-ghost" onClick={() => goToStep(1)}>
                      ← Back to parcel details
                    </button>
                    <button type="button" className="btn-primary" onClick={() => goToStep(3)}>
                      Continue to step 3 · Review
                    </button>
                  </div>
                </div>
              </div>
              <p className="listing-add-footer-note">
                <Link to="/dashboard">Dashboard</Link> · <Link to="/listings">Browse listings</Link>
              </p>
            </>
          ) : null}

          {step === 3 && listingId ? (
            <div className="reg-card" style={{ marginBottom: '2rem' }}>
              <div className="reg-card-bd" style={{ paddingTop: '1.5rem' }}>
                {submittedListing ? (
                  <div className="listing-add-success">
                    <h3>Listing submitted for admin review</h3>
                    <p>
                      Your parcel and KYL documents are in the queue. You can track status from your
                      dashboard; admins will assign scores when they review.
                    </p>
                    <div className="reg-actions" style={{ marginTop: '1rem' }}>
                      <Link to="/dashboard" className="btn-primary">
                        Dashboard
                      </Link>
                      <Link to="/listings" className="btn-ghost">
                        Browse listings
                      </Link>
                    </div>
                  </div>
                ) : (
                  <ListingReviewStep
                    token={token}
                    listingId={listingId}
                    onSubmitted={(listing) => setSubmittedListing(listing)}
                    onBack={() => goToStep(2)}
                  />
                )}
              </div>
            </div>
          ) : null}

          {step === 1 && !listingId ? (
            <div className="listing-add-docs-placeholder">
              <p>Complete step 1 to unlock documents and review.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
