import { Link } from 'react-router-dom';
import type { MarketplaceListing } from '../lib/listingsApi';
import { formatUpdatedShort, landCategoryLabel, listingStatusLabel } from '../lib/marketplaceUtils';

interface Props {
  listing: MarketplaceListing;
  /** e.g. `/deal-room/:id` or same page anchor */
  detailTo: string;
}

export function MarketplaceListingCard({ listing, detailTo }: Props) {
  const cat = landCategoryLabel(listing.landCategory);
  const score = listing.cumulativeScore;
  const scoreColor =
    score == null
      ? 'var(--muted)'
      : score >= 75
        ? 'var(--green)'
        : score >= 50
          ? 'var(--wheat)'
          : 'var(--terracotta)';

  return (
    <Link to={detailTo} className="listing-card listing-card--market">
      <div className="listing-card__top">
        <div>
          <div className="listing-card__eyebrow listing-card__eyebrow--muted">{cat}</div>
          <h3 className="listing-card__title">
            {listing.title}
            <br />
            <span className="listing-card__subtitle">{listing.location}</span>
          </h3>
          <p className="listing-card__survey">{listing.surveyLabel}</p>
        </div>
        <div className="listing-card__score-wrap">
          <div className="listing-card__score" style={{ color: scoreColor }}>
            {score != null ? Math.round(score * 10) / 10 : '—'}
          </div>
          <div className="listing-card__score-label">KYL</div>
        </div>
      </div>

      <div className="listing-card__stats">
        <div className="listing-card__stat">
          <div className="listing-card__stat-label">Area</div>
          <div className="listing-card__stat-val">{listing.areaDescription}</div>
        </div>
        <div className="listing-card__stat">
          <div className="listing-card__stat-label">Docs scored</div>
          <div className="listing-card__stat-val">{listing.scoredDocCount}</div>
        </div>
        <div className="listing-card__stat">
          <div className="listing-card__stat-label">Status</div>
          <div className="listing-card__stat-val">{listingStatusLabel(listing.status)}</div>
        </div>
      </div>

      <div className="listing-card__tags">
        {listing.status === 'reviewed' ? (
          <span className="tag green">KYL reviewed</span>
        ) : (
          <span className="tag gold">Admin review</span>
        )}
        {score != null && score >= 80 ? <span className="tag green">KYL 80+</span> : null}
      </div>

      <div className="listing-card__footer">
        <span className="listing-card__meta">{formatUpdatedShort(listing.updatedAt)}</span>
        <span className="listing-card__cta">View deal context →</span>
      </div>
    </Link>
  );
}
