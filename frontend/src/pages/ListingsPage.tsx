import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketplaceListingCard } from '../components/MarketplaceListingCard';
import { useAuth } from '../context/AuthContext';
import { fetchMarketplaceListings, type MarketplaceListing } from '../lib/listingsApi';
const FILTERS = [
  'All',
  'Residential',
  'Commercial',
  'Industrial',
  'Agricultural',
  'Mixed',
  'KYL 80+',
] as const;

type Filter = (typeof FILTERS)[number];

function matchesFilter(listing: MarketplaceListing, active: Filter): boolean {
  if (active === 'All') return true;
  if (active === 'KYL 80+') {
    return listing.cumulativeScore != null && listing.cumulativeScore >= 80;
  }
  const want = active.toLowerCase();
  const map: Record<string, string> = {
    residential: 'residential',
    commercial: 'commercial',
    industrial: 'industrial',
    agricultural: 'agricultural',
    mixed: 'mixed',
  };
  const key = map[want];
  return key ? listing.landCategory === key : true;
}

export function ListingsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Filter>('All');
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
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => listings.filter((l) => matchesFilter(l, active)),
    [listings, active],
  );

  return (
    <div className="listings-page">
      {user?.role === 'land_owner' ? (
        <div className="listings-owner-cta">
          <div className="listings-owner-cta__text">
            <strong>Post your land</strong>
            <span>
              {user.isApproved
                ? 'Add a listing and upload KYL documents one by one for that parcel.'
                : 'Complete admin verification on your dashboard before you can add a listing.'}
            </span>
          </div>
          {user.isApproved ? (
            <Link to="/listings/new" className="btn-primary listings-owner-cta__btn">
              Add listing
            </Link>
          ) : (
            <Link to="/dashboard" className="btn-ghost listings-owner-cta__btn">
              Verification status
            </Link>
          )}
        </div>
      ) : null}

      <div className="listings-hero">
        <div className="listings-hero__label">Land Marketplace</div>
        <h1 className="listings-hero__title">
          Verified Land <em>Listings</em>
        </h1>
        <p className="listings-hero__lead">
          Live parcels submitted for review — KYL scores reflect admin-approved categories.
        </p>
      </div>

      <div className="listings-filter-bar">
        <div className="listings-filter-bar__label">Filter</div>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-pill${active === f ? ' active' : ''}`}
            onClick={() => setActive(f)}
          >
            {f}
          </button>
        ))}
        <div className="listings-filter-bar__count">
          {loading ? 'Loading…' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {error ? (
        <p className="listings-page-error" role="alert">
          {error}{' '}
          <button type="button" className="listings-page-retry" onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : null}

      <div className="listings-grid-wrap">
        {loading ? (
          <div className="listings-page-loading">Loading listings…</div>
        ) : filtered.length === 0 ? (
          <div className="listings-page-empty">
            {listings.length === 0
              ? 'No published listings yet. Land owners can submit parcels for admin KYL review.'
              : 'No listings match this filter.'}
          </div>
        ) : (
          filtered.map((listing) => (
            <MarketplaceListingCard
              key={listing.id}
              listing={listing}
              detailTo={`/deal-room/${listing.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
