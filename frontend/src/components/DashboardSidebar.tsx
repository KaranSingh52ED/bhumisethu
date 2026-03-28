import { NavLink } from 'react-router-dom';
import type { UserRole } from '../types/auth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `sidebar-link${isActive ? ' active' : ''}`;

function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'land_owner':
      return 'Land owner';
    case 'builder':
      return 'Developer';
    default:
      return role;
  }
}

interface Props {
  role: UserRole;
  isApproved: boolean;
}

/**
 * Role-aware dashboard navigation — scalable pattern for adding role sections.
 */
export function DashboardSidebar({ role, isApproved }: Props) {
  return (
    <aside className="dash-sidebar" aria-label="Dashboard navigation">
      <div className="dash-sidebar-logo">Bhoomi Sethu</div>
      <div className="dash-sidebar-meta">
        <span className={`role-pill role-pill--${role}`}>{roleLabel(role)}</span>
        {role !== 'admin' && !isApproved ? (
          <span className="dash-sidebar-pending">Approval pending</span>
        ) : null}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Overview</div>
        <NavLink to="/dashboard" end className={linkClass}>
          <span aria-hidden>◆</span> Dashboard
        </NavLink>
        <NavLink to="/listings" className={linkClass}>
          <span aria-hidden>◇</span> Land listings
        </NavLink>
        <NavLink to="/deal-room" className={linkClass}>
          <span aria-hidden>◎</span> Deal room
        </NavLink>
      </div>

      {role === 'admin' ? (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Admin workspace</div>
          <a href="#admin-user-verification" className="sidebar-link">
            <span aria-hidden>✓</span> Profile verification
          </a>
          <a href="#listing-kyl-review" className="sidebar-link">
            <span aria-hidden>✓</span> Listing KYL scores
          </a>
          <a href="#admin-doc-queue" className="sidebar-link">
            <span aria-hidden>◇</span> Landowner doc queue
          </a>
        </div>
      ) : null}

      {role === 'land_owner' && isApproved ? (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Your land</div>
          <NavLink to="/listings/new" className={linkClass}>
            <span aria-hidden>+</span> New listing
          </NavLink>
        </div>
      ) : null}

      <div className="sidebar-section">
        <div className="sidebar-section-title">Account</div>
        <NavLink to="/profile" className={linkClass}>
          <span aria-hidden>◎</span> Profile &amp; settings
        </NavLink>
      </div>
    </aside>
  );
}
