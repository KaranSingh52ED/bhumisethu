import { Link } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <div className="footer-brand">
            Bhoomi <span>Sethu</span>
          </div>
          <p className="footer-desc">
            India&apos;s unified B2B land-to-developer marketplace. Standardising, de-risking, and
            accelerating real estate transactions. Starting in Telangana.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <span className="tag green">RERA Compliant</span>
            <span className="tag gold">Telangana First</span>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Platform</div>
          <Link className="footer-link" to="/dashboard">
            KYL Score
          </Link>
          <Link className="footer-link" to="/listings">
            Land Listings
          </Link>
          <Link className="footer-link" to="/deal-room">
            Deal Room
          </Link>
          <button type="button" className="footer-link">
            Feasibility Engine
          </button>
          <button type="button" className="footer-link">
            Professional Network
          </button>
        </div>
        <div>
          <div className="footer-col-title">For Users</div>
          <button type="button" className="footer-link">
            Landowners
          </button>
          <button type="button" className="footer-link">
            Developers
          </button>
          <button type="button" className="footer-link">
            Architects
          </button>
          <button type="button" className="footer-link">
            Legal Consultants
          </button>
          <button type="button" className="footer-link">
            Financial Advisors
          </button>
        </div>
        <div>
          <div className="footer-col-title">Company</div>
          <button type="button" className="footer-link">
            About
          </button>
          <button type="button" className="footer-link">
            Team 10 · ISB
          </button>
          <button type="button" className="footer-link">
            EPBM Capstone
          </button>
          <button type="button" className="footer-link">
            Contact
          </button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2025 Bhoomi Sethu · ISB EPBM Capstone · Team 10</span>
        <span>Hyderabad · Telangana · India</span>
      </div>
    </footer>
  );
}
