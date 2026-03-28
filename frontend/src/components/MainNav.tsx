import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import type { CredentialResponse } from '@react-oauth/google';

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined);

export function MainNav() {
  const { user, logout, loginWithGoogle } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 880) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const onGoogleSuccess = async (response: CredentialResponse) => {
    const idToken = response.credential;
    if (!idToken) {
      setError('Google login failed. Please try again.');
      return;
    }

    try {
      await loginWithGoogle(idToken);
      setError('');
      closeMenu();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    }
  };

  return (
    <>
      <nav className="nav-root" aria-label="Main">
        <div className="nav-bar">
          <NavLink to="/" className="nav-logo" end onClick={closeMenu}>
            Bhoomi <span>Sethu</span>
          </NavLink>

          <div className={`nav-links ${menuOpen ? 'nav-links--open' : ''}`}>
            <NavLink to="/" className={linkClass} end onClick={closeMenu}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={linkClass} onClick={closeMenu}>
              Dashboard
            </NavLink>
            <NavLink to="/listings" className={linkClass} onClick={closeMenu}>
              Land Listings
            </NavLink>
            <NavLink to="/deal-room" className={linkClass} onClick={closeMenu}>
              Deal Room
            </NavLink>
          </div>

          <div className="nav-trailing">
            {user ? (
              <>
                <span className={`nav-role-pill nav-role-pill--${user.role}`} title="Your role">
                  {user.role === 'land_owner'
                    ? 'Land owner'
                    : user.role === 'admin'
                      ? 'Admin'
                      : 'Developer'}
                </span>
                <button type="button" className="nav-cta" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <div className="nav-signin-cluster">
                <div className="google-login-wrap">
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={() => setError('Google sign-in failed.')}
                    text="continue_with"
                    shape="pill"
                    size="medium"
                  />
                </div>
                {error ? <p className="nav-auth-error">{error}</p> : null}
              </div>
            )}
            <button
              type="button"
              className="nav-burger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>
      {menuOpen ? (
        <button
          type="button"
          className="nav-backdrop is-visible"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}
    </>
  );
}
