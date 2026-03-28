import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RegistrationProfilePayload, SignupRole } from '../types/auth';

export function CompleteRegistrationPage() {
  const { user, isLoading, completeRegistration } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RegistrationProfilePayload>({
    role: 'land_owner',
    name: '',
    adhaarNumber: '',
    phoneNumber: '',
    address: '',
    country: '',
    city: '',
    state: '',
    pincode: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (user.registrationComplete) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setForm((prev) => ({
      ...prev,
      name: user.name || '',
      ...(isAdmin
        ? {}
        : {
            role: (user.role === 'builder' || user.role === 'land_owner'
              ? user.role
              : 'land_owner') as SignupRole,
          }),
    }));
  }, [user, isLoading, navigate, isAdmin]);

  const onChange =
    (field: keyof RegistrationProfilePayload) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload: RegistrationProfilePayload = { ...form, role: form.role ?? 'land_owner' };
      if (isAdmin) {
        delete payload.role;
      }
      await completeRegistration(payload);
      navigate('/dashboard', { replace: true, state: { profileSubmitted: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user || user.registrationComplete) {
    return <div className="reg-loading">Loading…</div>;
  }

  return (
    <div className="reg-shell">
      <div className="reg-inner">
        <div className="reg-step-badge">Step 2 · Profile &amp; verification</div>
        <div className="reg-card">
          <div className="reg-card-hd">
            <h1 className="reg-title">Complete your registration</h1>
            <p className="reg-lead">
              You signed in with Google in step 1. Now confirm your <strong>role</strong> and enter
              your KYC details. Everything here must match your official documents.
            </p>
          </div>
          <div className="reg-card-bd">
            <div className="reg-email-note">
              <strong>Email</strong> (from Google): {user.email}
            </div>

            {isAdmin ? (
              <p className="reg-admin-note">
                Administrator account — your role is set in the system. Complete your profile and
                contact details below.
              </p>
            ) : null}

            <form className="reg-form" onSubmit={(ev) => void onSubmit(ev)}>
              {!isAdmin ? (
                <div>
                  <label htmlFor="reg-role" className="reg-label">
                    Account role
                  </label>
                  <select
                    id="reg-role"
                    className="reg-select"
                    required
                    value={form.role ?? 'land_owner'}
                    onChange={onChange('role')}
                  >
                    <option value="builder">Builder</option>
                    <option value="land_owner">Land owner</option>
                  </select>
                  <p className="reg-lead" style={{ marginTop: '0.35rem', fontSize: '0.72rem' }}>
                    This should match how you use Bhoomi Sethu. You can change it here before
                    submitting.
                  </p>
                </div>
              ) : null}

              <div>
                <label htmlFor="reg-name" className="reg-label">
                  Full name (as per ID)
                </label>
                <input
                  id="reg-name"
                  className="reg-input"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={onChange('name')}
                  autoComplete="name"
                />
              </div>

              <div className="reg-grid-2">
                <div>
                  <label htmlFor="reg-aadhaar" className="reg-label">
                    Aadhaar number (12 digits)
                  </label>
                  <input
                    id="reg-aadhaar"
                    className="reg-input"
                    required
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    value={form.adhaarNumber}
                    onChange={onChange('adhaarNumber')}
                    placeholder="e.g. 1234 5678 9012"
                  />
                </div>
                <div>
                  <label htmlFor="reg-phone" className="reg-label">
                    Mobile number (10 digits)
                  </label>
                  <input
                    id="reg-phone"
                    className="reg-input"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={10}
                    value={form.phoneNumber}
                    onChange={onChange('phoneNumber')}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-address" className="reg-label">
                  Address
                </label>
                <textarea
                  id="reg-address"
                  className="reg-textarea"
                  required
                  minLength={5}
                  maxLength={500}
                  value={form.address}
                  onChange={onChange('address')}
                  autoComplete="street-address"
                />
              </div>

              <div className="reg-grid-2">
                <div>
                  <label htmlFor="reg-country" className="reg-label">
                    Country
                  </label>
                  <input
                    id="reg-country"
                    className="reg-input"
                    required
                    minLength={2}
                    maxLength={80}
                    value={form.country}
                    onChange={onChange('country')}
                    autoComplete="country-name"
                  />
                </div>
                <div>
                  <label htmlFor="reg-state" className="reg-label">
                    State
                  </label>
                  <input
                    id="reg-state"
                    className="reg-input"
                    required
                    minLength={2}
                    maxLength={80}
                    value={form.state}
                    onChange={onChange('state')}
                    autoComplete="address-level1"
                  />
                </div>
              </div>

              <div className="reg-grid-2">
                <div>
                  <label htmlFor="reg-city" className="reg-label">
                    City
                  </label>
                  <input
                    id="reg-city"
                    className="reg-input"
                    required
                    minLength={2}
                    maxLength={80}
                    value={form.city}
                    onChange={onChange('city')}
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <label htmlFor="reg-pincode" className="reg-label">
                    PIN code (6 digits)
                  </label>
                  <input
                    id="reg-pincode"
                    className="reg-input"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={onChange('pincode')}
                    autoComplete="postal-code"
                  />
                </div>
              </div>

              {error ? <p className="reg-error">{error}</p> : null}

              <div className="reg-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save and continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
