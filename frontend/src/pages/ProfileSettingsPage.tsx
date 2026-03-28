import { Link } from 'react-router-dom';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { LandOwnerDocumentsSection } from '../components/LandOwnerDocumentsSection';
import { ProfileListingKylSection } from '../components/ProfileListingKylSection';
import { useAuth } from '../context/AuthContext';

export function ProfileSettingsPage() {
  const { user, token, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="dash-layout">
        <div className="dash-main" style={{ padding: '3rem' }}>
          Loading…
        </div>
      </div>
    );
  }

  const isLandOwner = user.role === 'land_owner';
  const canManagePlatformKyl = isLandOwner && user.isApproved;

  return (
    <div className="dash-layout">
      <DashboardSidebar role={user.role} isApproved={user.isApproved} />

      <main className="dash-main">
        <div className="dash-header">
          <div>
            <div className="dash-greeting">Profile &amp; settings</div>
            <div className="dash-date">
              Account details, listing KYL status per parcel, and platform documents.
            </div>
          </div>
          <Link to="/dashboard" className="btn-ghost dash-header-cta">
            ← Dashboard
          </Link>
        </div>

        <div className="dash-card profile-account-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Account</div>
          </div>
          <div className="dash-card-body profile-account-grid">
            <div>
              <div className="profile-field-label">Name</div>
              <div className="profile-field-val">{user.name}</div>
            </div>
            <div>
              <div className="profile-field-label">Email</div>
              <div className="profile-field-val">{user.email}</div>
            </div>
            <div>
              <div className="profile-field-label">Role</div>
              <div className="profile-field-val">
                {user.role === 'land_owner'
                  ? 'Land owner'
                  : user.role === 'builder'
                    ? 'Developer'
                    : 'Admin'}
              </div>
            </div>
            <div>
              <div className="profile-field-label">Phone</div>
              <div className="profile-field-val">{user.phoneNumber || '—'}</div>
            </div>
            <div>
              <div className="profile-field-label">Location</div>
              <div className="profile-field-val">
                {[user.city, user.state, user.pincode].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
            <div>
              <div className="profile-field-label">Verification</div>
              <div className="profile-field-val">
                {user.isApproved ? (
                  <span className="profile-badge profile-badge--ok">Approved</span>
                ) : (
                  <span className="profile-badge profile-badge--pending">
                    Pending admin approval
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLandOwner ? (
          canManagePlatformKyl && token ? (
            <div className="profile-docs-stack">
              <ProfileListingKylSection token={token} />
              <LandOwnerDocumentsSection token={token} />
            </div>
          ) : (
            <div className="dash-card" style={{ marginTop: '1.25rem' }}>
              <div className="dash-card-header">
                <div className="dash-card-title">Platform KYL documents</div>
              </div>
              <div className="dash-card-body">
                <p className="profile-kyl-locked">
                  After your account is approved by an administrator, you can upload and manage your
                  platform KYL documents here. Replacing any approved file will send it back for
                  admin review.
                </p>
              </div>
            </div>
          )
        ) : user.role === 'builder' ? (
          <div className="dash-card" style={{ marginTop: '1.25rem' }}>
            <div className="dash-card-header">
              <div className="dash-card-title">Developer account</div>
            </div>
            <div className="dash-card-body">
              <p className="profile-kyl-locked" style={{ margin: 0 }}>
                Platform KYL uploads apply to land owners. Use the dashboard and deal room for your
                pipeline.
              </p>
            </div>
          </div>
        ) : (
          <div className="dash-card" style={{ marginTop: '1.25rem' }}>
            <div className="dash-card-header">
              <div className="dash-card-title">Administrator</div>
            </div>
            <div className="dash-card-body">
              <p className="profile-kyl-locked" style={{ margin: 0 }}>
                Use the dashboard for verification queues and listing reviews.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
