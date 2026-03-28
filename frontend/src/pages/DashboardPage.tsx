import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AdminDocumentReviewSection } from '../components/AdminDocumentReviewSection';
import { AdminListingReviewSection } from '../components/AdminListingReviewSection';
import { AdminUserVerificationSection } from '../components/AdminUserVerificationSection';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { useAuth } from '../context/AuthContext';
import { getDashboardData } from '../lib/authApi';
import { fetchAdminSubmittedListings, fetchMyListings, type MyListing } from '../lib/listingsApi';
import type { DashboardResponse } from '../types/auth';

export function DashboardPage() {
  const { user, token, isLoading, refreshUser } = useAuth();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [listingsError, setListingsError] = useState('');
  const [adminQueueCount, setAdminQueueCount] = useState<number | null>(null);
  const [adminReviewedCount, setAdminReviewedCount] = useState<number | null>(null);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onFocus = () => void refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || !token) {
        setDashboardData(null);
        return;
      }
      if (user.role !== 'admin' && !user.isApproved) {
        setDashboardData(null);
        setError('');
        return;
      }
      try {
        const data = await getDashboardData(token, user.role);
        setDashboardData(data);
        setError('');
      } catch (dashboardError) {
        setError(
          dashboardError instanceof Error
            ? dashboardError.message
            : 'Failed to load dashboard data.',
        );
      }
    };
    void loadDashboard();
  }, [user, token]);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role === 'land_owner') {
      if (!user.isApproved) {
        setMyListings([]);
        setListingsError('');
        return;
      }
      setListingsError('');
      void fetchMyListings(token)
        .then((r) => setMyListings(r.listings))
        .catch((e) =>
          setListingsError(e instanceof Error ? e.message : 'Could not load your listings.'),
        );
    }
    if (user.role === 'admin') {
      void fetchAdminSubmittedListings(token)
        .then((r) => {
          const rows = r.listings;
          setAdminQueueCount(rows.filter((l) => l.status === 'submitted').length);
          setAdminReviewedCount(rows.filter((l) => l.status === 'reviewed').length);
        })
        .catch(() => {
          setAdminQueueCount(null);
          setAdminReviewedCount(null);
        });
    }
  }, [token, user]);

  useEffect(() => {
    const id = location.hash.replace('#', '');
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.hash]);

  const landOwnerKylAvg = useMemo(() => {
    const scored = myListings.filter(
      (l) => l.cumulativeScore != null && !Number.isNaN(l.cumulativeScore as number),
    );
    if (scored.length === 0) return null;
    const sum = scored.reduce((a, l) => a + (l.cumulativeScore as number), 0);
    return Math.round((sum / scored.length) * 10) / 10;
  }, [myListings]);

  if (isLoading || !user) {
    return (
      <div className="dash-layout">
        <div className="dash-main" style={{ padding: '3rem' }}>
          Restoring session…
        </div>
      </div>
    );
  }

  const isLandOwnerApproved = user.role === 'land_owner' && user.isApproved;
  const showAddListingCta = isLandOwnerApproved;
  const profileSubmitted = Boolean(
    (location.state as { profileSubmitted?: boolean } | null)?.profileSubmitted,
  );

  return (
    <div className="dash-layout">
      <DashboardSidebar role={user.role} isApproved={user.isApproved} />

      <main className="dash-main">
        {user.role === 'admin' && token ? (
          <div className="admin-dashboard-stack">
            <AdminUserVerificationSection token={token} />
            <AdminListingReviewSection token={token} />
            <AdminDocumentReviewSection token={token} />
          </div>
        ) : null}

        {profileSubmitted && user.role !== 'admin' && !user.isApproved ? (
          <div className="dash-inline-alert dash-inline-alert--success" role="status">
            Profile submitted. An administrator will verify your details; you will get full access
            after approval.
          </div>
        ) : null}

        <div className="dash-header">
          <div>
            <div className="dash-greeting">
              Welcome back, <span>{user.name ?? 'Guest'}</span>
            </div>
            <div className="dash-date">
              {dashboardData?.welcome ??
                (user && !user.isApproved && user.role !== 'admin'
                  ? 'Your profile is verified by admins before you can list land or join deal activity.'
                  : 'Your workspace for verified land and KYL scoring.')}
            </div>
          </div>
          {showAddListingCta ? (
            <Link to="/listings/new" className="btn-primary dash-header-cta">
              + New listing
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="dash-inline-alert" role="alert">
            {error}
          </div>
        ) : null}

        {user.role === 'admin' ? (
          <div className="kpi-row kpi-row--admin">
            <div className="kpi-card">
              <div className="kpi-label">Listing queue</div>
              <div className="kpi-val">{adminQueueCount ?? '—'}</div>
              <div className="kpi-sub">Awaiting KYL scores</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Reviewed</div>
              <div className="kpi-val">{adminReviewedCount ?? '—'}</div>
              <div className="kpi-sub">Fully scored listings</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Workspace</div>
              <div className="kpi-val" style={{ fontSize: '1.35rem' }}>
                KYL
              </div>
              <div className="kpi-sub">Use sections above</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Land listings</div>
              <div className="kpi-val" style={{ fontSize: '1.35rem' }}>
                Live
              </div>
              <div className="kpi-sub">
                <Link to="/listings">Browse →</Link>
              </div>
            </div>
          </div>
        ) : user.role === 'land_owner' ? (
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">My listings</div>
              <div className="kpi-val">{myListings.length}</div>
              <div className="kpi-sub">Saved parcels</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Avg. KYL score</div>
              <div className="kpi-val">{landOwnerKylAvg != null ? landOwnerKylAvg : '—'}</div>
              <div className="kpi-sub">Across scored listings</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Deal room</div>
              <div className="kpi-val" style={{ fontSize: '1.5rem' }}>
                →
              </div>
              <div className="kpi-sub">
                {user.isApproved ? <Link to="/deal-room">Open</Link> : 'After approval'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">New listing</div>
              <div className="kpi-val" style={{ fontSize: '1.5rem' }}>
                +
              </div>
              <div className="kpi-sub">
                {isLandOwnerApproved ? <Link to="/listings/new">Add land</Link> : 'After approval'}
              </div>
            </div>
          </div>
        ) : (
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">Listings</div>
              <div className="kpi-val">—</div>
              <div className="kpi-sub">
                <Link to="/listings">Browse marketplace</Link>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Deal room</div>
              <div className="kpi-val">→</div>
              <div className="kpi-sub">
                {user.isApproved ? <Link to="/deal-room">Matches</Link> : 'After approval'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">KYL</div>
              <div className="kpi-val">✓</div>
              <div className="kpi-sub">Verified pipeline</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Support</div>
              <div className="kpi-val">◎</div>
              <div className="kpi-sub">Coming soon</div>
            </div>
          </div>
        )}

        <div className="dash-grid">
          <div>
            <div className="dash-card">
              <div className="dash-card-header">
                <div className="dash-card-title">
                  {user.role === 'land_owner' ? 'My land listings' : 'Marketplace snapshot'}
                </div>
                <Link className="dash-card-action" to="/listings">
                  View all →
                </Link>
              </div>
              <div className="dash-card-body">
                {user.role === 'land_owner' ? (
                  listingsError ? (
                    <p className="dash-inline-alert">{listingsError}</p>
                  ) : myListings.length === 0 ? (
                    <p className="dash-empty-hint">
                      No listings yet.{' '}
                      {isLandOwnerApproved ? (
                        <Link to="/listings/new">Create your first listing</Link>
                      ) : null}
                    </p>
                  ) : (
                    <>
                      <div className="listing-row header">
                        <div>Property</div>
                        <div>Area</div>
                        <div>KYL</div>
                        <div>Status</div>
                        <div />
                      </div>
                      {myListings.map((l) => (
                        <Link key={l.id} to="/listings" className="listing-row listing-row--link">
                          <div>
                            <div className="listing-name">{l.title}</div>
                            <div className="listing-loc">
                              📍 {l.location} · {l.landCategory}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.72rem' }}>{l.areaDescription}</div>
                          <div>
                            {l.cumulativeScore != null ? (
                              <span
                                className={`kyl-mini ${
                                  l.cumulativeScore >= 75
                                    ? 'hi'
                                    : l.cumulativeScore >= 50
                                      ? 'md'
                                      : 'lo'
                                }`}
                              >
                                {l.cumulativeScore}
                              </span>
                            ) : (
                              <span className="kyl-mini kyl-mini--na">—</span>
                            )}
                          </div>
                          <div>
                            <span className={`status-badge status-badge--${l.status}`}>
                              {l.status === 'draft'
                                ? 'Draft'
                                : l.status === 'submitted'
                                  ? 'Submitted'
                                  : l.status === 'reviewed'
                                    ? 'Reviewed'
                                    : l.status}
                            </span>
                          </div>
                          <div className="row-action">→</div>
                        </Link>
                      ))}
                    </>
                  )
                ) : (
                  <p className="dash-empty-hint">
                    Explore verified land on the <Link to="/listings">listings page</Link>. Admins
                    manage KYL scoring from the workspace above.
                  </p>
                )}
              </div>
            </div>

            <div className="dash-card" style={{ marginTop: '1.5rem' }}>
              <div className="dash-card-header">
                <div className="dash-card-title">Recent activity</div>
              </div>
              <div className="dash-card-body">
                <ul className="dash-activity-list">
                  <li>
                    <span className="dash-activity-dot dash-activity-dot--green" />
                    <div>
                      <div className="dash-activity-title">Platform tip</div>
                      <div className="dash-activity-meta">
                        Complete KYL uploads to improve match quality with developers.
                      </div>
                    </div>
                  </li>
                  <li>
                    <span className="dash-activity-dot dash-activity-dot--wheat" />
                    <div>
                      <div className="dash-activity-title">Documents</div>
                      <div className="dash-activity-meta">
                        One file per category — review everything in step 3 before submitting.
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <div className="dash-card">
              <div className="dash-card-header">
                <div className="dash-card-title">Shortcuts</div>
              </div>
              <div className="dash-card-body dash-shortcuts">
                <Link to="/listings" className="dash-shortcut">
                  <span className="dash-shortcut__label">Land listings</span>
                  <span className="dash-shortcut__hint">Browse &amp; filter</span>
                </Link>
                {user.isApproved ? (
                  <Link to="/deal-room" className="dash-shortcut">
                    <span className="dash-shortcut__label">Deal room</span>
                    <span className="dash-shortcut__hint">Matches &amp; terms</span>
                  </Link>
                ) : (
                  <div className="dash-shortcut dash-shortcut--muted">
                    <span className="dash-shortcut__label">Deal room</span>
                    <span className="dash-shortcut__hint">After profile approval</span>
                  </div>
                )}
                {isLandOwnerApproved ? (
                  <Link to="/listings/new" className="dash-shortcut">
                    <span className="dash-shortcut__label">New listing</span>
                    <span className="dash-shortcut__hint">Parcel + KYL</span>
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="dash-card" style={{ marginTop: '1.5rem' }}>
              <div className="dash-card-header">
                <div className="dash-card-title">Compliance mindset</div>
              </div>
              <div className="dash-card-body">
                <ul className="dash-compliance-list">
                  <li>
                    <span style={{ color: 'var(--green)' }}>✓</span> Title &amp; encumbrance
                    verified in KYL flow
                  </li>
                  <li>
                    <span style={{ color: '#b07c10' }}>◇</span> RERA &amp; local body checks as
                    applicable
                  </li>
                  <li>
                    <span style={{ color: 'var(--muted)' }}>◎</span> Environmental &amp; layout when
                    required
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
