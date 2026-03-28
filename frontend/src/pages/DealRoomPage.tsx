import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MarketplaceListingCard } from '../components/MarketplaceListingCard';
import {
  fetchMarketplaceListings,
  fetchPublicListingDetail,
  type MarketplaceListing,
  type PublicListingDetailResponse,
} from '../lib/listingsApi';
import { formatUpdatedShort, landCategoryLabel, listingStatusLabel } from '../lib/marketplaceUtils';

/** Display value or typographic dash when data is not on file yet. */
function paramOrDash(value: string | undefined | null): string {
  if (value == null || String(value).trim() === '') return '—';
  return String(value).trim();
}

const DEAL_MILESTONES = [
  { id: '1', label: 'Term sheet generated', state: 'upcoming' as const },
  { id: '2', label: 'Legal review — landowner counsel', state: 'upcoming' as const },
  { id: '3', label: 'Developer due diligence', state: 'upcoming' as const },
  { id: '4', label: 'JV agreement — e-sign', state: 'upcoming' as const },
];

const ARCH_OPTIONS = [
  {
    id: 'a',
    title: 'Option A — High-rise',
    lines: ['Unit mix & saleable area', 'Parking & basement levels', 'Estimated revenue range'],
  },
  {
    id: 'b',
    title: 'Option B — Villa / plotted',
    lines: ['Plot sizes & open space', 'Amenity footprint', 'Estimated revenue range'],
  },
];

function DealRoomHub() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchMarketplaceListings();
      setListings(res.listings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="deal-room-hub">
      <div className="deal-room-hub__inner">
        <header className="deal-room-hub__head">
          <Link to="/listings" className="deal-room-hub__back">
            Land listings
          </Link>
          <h1 className="deal-room-hub__title">Deal room</h1>
          <p className="deal-room-hub__lead">
            Open any published parcel to review its Know Your Land (KYL) scores. Inventory matches
            the Land listings marketplace.
          </p>
        </header>

        {error ? (
          <p className="deal-room-detail-error" role="alert">
            {error}{' '}
            <button type="button" className="listings-page-retry" onClick={() => void load()}>
              Retry
            </button>
          </p>
        ) : null}

        <div className="listings-grid-wrap" style={{ background: 'var(--border)' }}>
          {loading ? (
            <div className="listings-page-loading" style={{ gridColumn: '1 / -1' }}>
              Loading…
            </div>
          ) : listings.length === 0 ? (
            <div className="listings-page-empty" style={{ gridColumn: '1 / -1' }}>
              No published listings yet.
            </div>
          ) : (
            listings.map((listing) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                detailTo={`/deal-room/${listing.id}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DealRoomDetail({ listingId }: { listingId: string }) {
  const [data, setData] = useState<PublicListingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchPublicListingDetail(listingId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load listing.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="deal-room-detail-page">
        <div className="deal-room-detail-loader">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="deal-room-detail-page deal-room-detail-page--narrow">
        <Link to="/listings" className="deal-room-nav-link">
          Land listings
        </Link>
        <p className="deal-room-detail-error">{error ?? 'Not found.'}</p>
        <Link to="/deal-room" className="btn-primary deal-room-error-cta">
          Back to deal room
        </Link>
      </div>
    );
  }

  const { listing, categoryScores } = data;
  const scoredRows = categoryScores.filter((c) => c.score != null && !Number.isNaN(c.score));
  const heroKylRows = scoredRows.slice(0, 6);
  const cumulative =
    listing.cumulativeScore != null ? Math.round(listing.cumulativeScore * 10) / 10 : null;
  const tier =
    cumulative == null
      ? 'unscored'
      : cumulative >= 75
        ? 'strong'
        : cumulative >= 50
          ? 'moderate'
          : 'developing';

  return (
    <div className="deal-room-detail-page">
      <div className="deal-room-hero-band">
        <nav className="deal-room-nav deal-room-nav--hero" aria-label="Breadcrumb">
          <Link to="/listings" className="deal-room-nav-link">
            Listings
          </Link>
          <span className="deal-room-nav-sep" aria-hidden>
            /
          </span>
          <span className="deal-room-nav-current">{listing.surveyLabel}</span>
        </nav>

        <header className="deal-room-header deal-room-header--hero">
          <div className="deal-room-header__main">
            <div className="deal-room-badges">
              <span className="deal-room-badge deal-room-badge--status">
                {listingStatusLabel(listing.status)}
              </span>
              <span className="deal-room-badge deal-room-badge--muted">
                {landCategoryLabel(listing.landCategory)}
              </span>
              <span className={`deal-room-badge deal-room-badge--kyl deal-room-badge--kyl-${tier}`}>
                {cumulative != null ? `KYL ${cumulative}` : 'KYL pending'}
              </span>
            </div>
            <h1 className="deal-room-title deal-room-title--hero">{listing.title}</h1>
            <ul className="deal-room-hero-meta" aria-label="Parcel summary">
              <li>
                <span className="deal-room-hero-meta__label">Location</span>
                <span className="deal-room-hero-meta__val">{listing.location}</span>
              </li>
              <li>
                <span className="deal-room-hero-meta__label">Extent</span>
                <span className="deal-room-hero-meta__val">{listing.areaDescription}</span>
              </li>
              <li>
                <span className="deal-room-hero-meta__label">Land use</span>
                <span className="deal-room-hero-meta__val">
                  {landCategoryLabel(listing.landCategory)}
                </span>
              </li>
              <li>
                <span className="deal-room-hero-meta__label">Deal structure</span>
                <span className="deal-room-hero-meta__val deal-room-hero-meta__val--muted">—</span>
              </li>
            </ul>
            {listing.description ? (
              <p className="deal-room-summary deal-room-summary--hero">{listing.description}</p>
            ) : null}
          </div>

          <aside
            className={`deal-room-kyl-card deal-room-kyl-card--hero deal-room-kyl-card--${tier}`}
            aria-labelledby="kyl-cumulative-label"
          >
            <div id="kyl-cumulative-label" className="deal-room-kyl-card__label">
              KYL score
            </div>
            <div className="deal-room-kyl-card__score" aria-live="polite">
              {cumulative != null ? (
                <>
                  <span className="deal-room-kyl-card__num">{Math.round(cumulative)}</span>
                  <span className="deal-room-kyl-card__denom">/ 100</span>
                </>
              ) : (
                <span className="deal-room-kyl-card__pending">Pending verification</span>
              )}
            </div>
            {heroKylRows.length > 0 ? (
              <ul className="deal-room-kyl-card__mini">
                {heroKylRows.map((row) => (
                  <li key={row.documentKey} className="deal-room-kyl-card__mini-row">
                    <span className="deal-room-kyl-card__mini-name">{row.category}</span>
                    <span className="deal-room-kyl-card__mini-val">{row.score}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="deal-room-kyl-card__mini-empty">
                Category scores will appear after verification.
              </p>
            )}
            <p className="deal-room-kyl-card__meta">
              {listing.scoredRequiredCount} of {listing.requiredCategoryCount} required categories
              scored
            </p>
          </aside>
        </header>
      </div>

      <div className="deal-room-shell">
        <div className="deal-room-layout">
          <main className="deal-room-main">
            <section
              className="deal-room-section deal-room-section--card"
              aria-labelledby="land-attr-heading"
            >
              <h2
                id="land-attr-heading"
                className="deal-room-section__title deal-room-section__title--lg"
              >
                Land attributes & feasibility
              </h2>
              <p className="deal-room-section__lead">
                Technical parameters for diligence. Values shown below come from your listing where
                available; additional fields can be attached as your deal room data model expands.
              </p>
              <div className="deal-room-param-grid">
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Survey number</span>
                  <span className="deal-room-param-val">{paramOrDash(listing.surveyLabel)}</span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Total area</span>
                  <span className="deal-room-param-val">
                    {paramOrDash(listing.areaDescription)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">FSI permissible</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Saleable area (est.)</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Guideline value</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Construction cost (est.)</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Zone classification</span>
                  <span className="deal-room-param-val">
                    {landCategoryLabel(listing.landCategory)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Road access</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
              </div>
            </section>

            <section
              className="deal-room-section deal-room-section--card"
              aria-labelledby="jv-heading"
            >
              <h2 id="jv-heading" className="deal-room-section__title deal-room-section__title--lg">
                JV deal room — current scenario
              </h2>
              <p className="deal-room-section__lead">
                Commercial terms are disclosed under engagement. Placeholder rows below will bind to
                your JV workflow when enabled.
              </p>
              <div className="deal-room-param-grid deal-room-param-grid--compact">
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">JV structure</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Landowner share</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Developer share</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Revenue estimate</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Landowner return</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
                <div className="deal-room-param-cell">
                  <span className="deal-room-param-label">Timeline</span>
                  <span className="deal-room-param-val deal-room-param-val--placeholder">
                    {paramOrDash(undefined)}
                  </span>
                </div>
              </div>
            </section>

            <section
              className="deal-room-section deal-room-section--card"
              aria-labelledby="milestones-heading"
            >
              <h2 id="milestones-heading" className="deal-room-section__title">
                Deal progress
              </h2>
              <ul className="deal-room-milestones">
                {DEAL_MILESTONES.map((m) => (
                  <li
                    key={m.id}
                    className="deal-room-milestones__item deal-room-milestones__item--upcoming"
                  >
                    <span className="deal-room-milestones__icon" aria-hidden>
                      ○
                    </span>
                    <span className="deal-room-milestones__label">{m.label}</span>
                    <span className="deal-room-milestones__state">Upcoming</span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="deal-room-section deal-room-section--card"
              aria-labelledby="arch-heading"
            >
              <h2 id="arch-heading" className="deal-room-section__title">
                Architect test-fit study
              </h2>
              <p className="deal-room-section__lead">
                Comparative development options for board review.
              </p>
              <div className="deal-room-arch-grid">
                {ARCH_OPTIONS.map((opt) => (
                  <div key={opt.id} className="deal-room-arch-card">
                    <h3 className="deal-room-arch-card__title">{opt.title}</h3>
                    <ul className="deal-room-arch-card__list">
                      {opt.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <p className="deal-room-arch-card__foot">
                      Figures to be modelled in your workspace.
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="deal-room-section" aria-labelledby="kyl-breakdown-heading">
              <div className="deal-room-section__head">
                <h2
                  id="kyl-breakdown-heading"
                  className="deal-room-section__title deal-room-section__title--lg"
                >
                  KYL score breakdown
                </h2>
                <p className="deal-room-section__lead">
                  Weighted view of verified categories. Bars reflect admin-assigned scores;
                  categories still under review stay out until scored.
                </p>
              </div>

              {scoredRows.length === 0 ? (
                <p className="deal-room-kyl-empty">
                  No category scores yet. Scores appear here after the verification workflow is
                  complete for each dimension.
                </p>
              ) : (
                <ul className="deal-room-bar-list">
                  {scoredRows.map((row) => {
                    const pct = Math.min(100, Math.max(0, row.score ?? 0));
                    return (
                      <li key={row.documentKey} className="deal-room-bar-item">
                        <div className="deal-room-bar-item__label">
                          <span className="deal-room-bar-item__name">{row.category}</span>
                          {row.optional ? (
                            <span className="deal-room-bar-item__opt">Optional</span>
                          ) : null}
                        </div>
                        <div className="deal-room-bar-item__track" role="presentation">
                          <div
                            className="deal-room-bar-item__fill"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct >= 85
                                  ? 'var(--green)'
                                  : pct >= 70
                                    ? 'var(--wheat)'
                                    : 'var(--terracotta)',
                            }}
                          />
                        </div>
                        <span className="deal-room-bar-item__value">{row.score}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </main>

          <aside className="deal-room-aside" aria-label="Actions">
            <div className="deal-room-aside__sticky">
              <Link to="/deal-room" className="deal-room-cta deal-room-cta--primary">
                Deal room hub →
              </Link>
              <button
                type="button"
                className="deal-room-cta deal-room-cta--dark"
                disabled
                title="Coming soon"
              >
                Download KYL summary
              </button>
              <button
                type="button"
                className="deal-room-cta deal-room-cta--outline"
                disabled
                title="Coming soon"
              >
                Request architect test-fit
              </button>
              <button
                type="button"
                className="deal-room-cta deal-room-cta--outline"
                disabled
                title="Coming soon"
              >
                Connect legal advisor
              </button>

              <div className="deal-room-match-card">
                <div className="deal-room-match-card__label">Land readiness</div>
                <div className="deal-room-match-card__score">
                  {cumulative != null ? `${Math.round(cumulative)}` : '—'}
                  {cumulative != null ? (
                    <span className="deal-room-match-card__suffix"> / 100</span>
                  ) : null}
                </div>
                <p className="deal-room-match-card__meta">
                  Derived from cumulative KYL. Developer matching and partner scores will layer on
                  once your marketplace connections go live.
                </p>
              </div>

              <p className="deal-room-aside__note">{formatUpdatedShort(listing.updatedAt)}</p>
            </div>
          </aside>
        </div>
      </div>

      <footer className="deal-room-footer">
        <Link to="/listings" className="deal-room-footer__link">
          All listings
        </Link>
        <Link to="/deal-room" className="deal-room-footer__link">
          Deal room hub
        </Link>
      </footer>
    </div>
  );
}

export function DealRoomPage() {
  const { listingId } = useParams<{ listingId: string }>();

  if (!listingId) {
    return <DealRoomHub />;
  }

  return <DealRoomDetail listingId={listingId} />;
}
