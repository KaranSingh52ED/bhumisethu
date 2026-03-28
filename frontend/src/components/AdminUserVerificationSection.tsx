import { useCallback, useEffect, useState } from 'react';
import { approveUserByGoogleId, fetchPendingVerificationUsers } from '../lib/authApi';
import type { AuthUser } from '../types/auth';

interface Props {
  token: string;
}

function roleLabel(role: string): string {
  return role === 'land_owner' ? 'Land owner' : role === 'builder' ? 'Developer' : role;
}

export function AdminUserVerificationSection({ token }: Props) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetchPendingVerificationUsers(token);
      setUsers(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load pending users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onApprove = async (googleId: string) => {
    setBusyId(googleId);
    setActionMsg('');
    try {
      await approveUserByGoogleId(token, googleId);
      setActionMsg('User approved. They can access listings and deal room on next refresh.');
      setUsers((prev) => prev.filter((u) => u.id !== googleId));
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Approval failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      id="admin-user-verification"
      className="admin-verify-section"
      aria-labelledby="admin-verify-heading"
    >
      <div className="admin-kyl-hero">
        <h2 id="admin-verify-heading" className="admin-kyl-hero__title">
          Profile verification
        </h2>
        <p className="admin-kyl-hero__lead">
          Land owners and developers must be approved here after they complete registration. Until
          then, they cannot create listings or use the deal room.
        </p>
      </div>

      <div className="dash-card admin-kyl-card">
        <div className="dash-card-header">
          <div className="dash-card-title">Pending accounts ({users.length})</div>
          <button type="button" className="dash-card-action" onClick={() => void load()}>
            Refresh
          </button>
        </div>
        <div className="dash-card-body">
          {actionMsg ? <p className="admin-kyl-error admin-kyl-error--ok">{actionMsg}</p> : null}
          {error ? <p className="admin-kyl-error">{error}</p> : null}
          {loading ? (
            <p className="admin-kyl-loading">Loading…</p>
          ) : users.length === 0 ? (
            <p className="admin-kyl-empty">No profiles awaiting verification.</p>
          ) : (
            <ul className="admin-verify-list">
              {users.map((u) => (
                <li key={u.id} className="admin-verify-row">
                  <div className="admin-verify-row__main">
                    <strong>{u.name}</strong>
                    <span className="admin-verify-row__email">{u.email}</span>
                    <span className={`role-pill role-pill--${u.role}`}>{roleLabel(u.role)}</span>
                    <span className="admin-verify-row__meta">
                      {u.city}, {u.state}
                      {u.adhaarNumber && u.adhaarNumber.length >= 4
                        ? ` · Aadhaar ···${u.adhaarNumber.slice(-4)}`
                        : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-primary--sm"
                    disabled={busyId !== null}
                    onClick={() => void onApprove(u.id)}
                  >
                    {busyId === u.id ? 'Approving…' : 'Approve'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
