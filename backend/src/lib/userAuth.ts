import type { AuthTokenPayload, UserRole } from '../types/auth';

export interface UserLean {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  isApproved: boolean;
  adhaarNumber?: string;
  phoneNumber?: string;
  address?: string;
  country?: string;
  city?: string;
  state?: string;
  pincode?: string;
  registrationComplete?: boolean;
}

export const tokenPayloadFromUser = (user: UserLean): Omit<AuthTokenPayload, 'iat' | 'exp'> => ({
  sub: user.googleId,
  email: user.email,
  name: user.name,
  adhaarNumber: user.adhaarNumber ?? '',
  phoneNumber: user.phoneNumber ?? '',
  address: user.address ?? '',
  country: user.country ?? '',
  city: user.city ?? '',
  state: user.state ?? '',
  pincode: user.pincode ?? '',
  picture: user.picture,
  role: user.role,
  isApproved: user.isApproved,
  registrationComplete: Boolean(user.registrationComplete),
});

export const publicUserFromLean = (user: UserLean) => ({
  id: user.googleId,
  email: user.email,
  name: user.name,
  picture: user.picture,
  role: user.role,
  isApproved: user.isApproved,
  adhaarNumber: user.adhaarNumber ?? '',
  phoneNumber: user.phoneNumber ?? '',
  address: user.address ?? '',
  country: user.country ?? '',
  city: user.city ?? '',
  state: user.state ?? '',
  pincode: user.pincode ?? '',
  registrationComplete: Boolean(user.registrationComplete),
});

const digitsOnly = (value: string): string => value.replace(/\D/g, '');

export type ValidatedProfileData = {
  name: string;
  adhaarNumber: string;
  phoneNumber: string;
  address: string;
  country: string;
  city: string;
  state: string;
  pincode: string;
  role?: 'builder' | 'land_owner';
};

export const validateProfilePayload = (
  body: Record<string, unknown>,
  options?: { requireRole?: boolean },
): { ok: true; data: ValidatedProfileData } | { ok: false; message: string } => {
  const requireRole = options?.requireRole ?? true;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const adhaarNumber = typeof body.adhaarNumber === 'string' ? digitsOnly(body.adhaarNumber) : '';
  const phoneNumber = typeof body.phoneNumber === 'string' ? digitsOnly(body.phoneNumber) : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const state = typeof body.state === 'string' ? body.state.trim() : '';
  const pincode = typeof body.pincode === 'string' ? digitsOnly(body.pincode) : '';

  let role: 'builder' | 'land_owner' | undefined;
  if (requireRole) {
    const raw = body.role;
    if (raw !== 'builder' && raw !== 'land_owner') {
      return { ok: false, message: 'Choose your account role: Builder or Land owner.' };
    }
    role = raw;
  }

  if (name.length < 2 || name.length > 120) {
    return { ok: false, message: 'Name must be between 2 and 120 characters.' };
  }
  if (adhaarNumber.length !== 12) {
    return { ok: false, message: 'Aadhaar number must be exactly 12 digits.' };
  }
  if (phoneNumber.length !== 10 || !/^[6-9]/.test(phoneNumber)) {
    return { ok: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }
  if (address.length < 5 || address.length > 500) {
    return { ok: false, message: 'Address must be between 5 and 500 characters.' };
  }
  if (country.length < 2 || country.length > 80) {
    return { ok: false, message: 'Country is required.' };
  }
  if (city.length < 2 || city.length > 80) {
    return { ok: false, message: 'City is required.' };
  }
  if (state.length < 2 || state.length > 80) {
    return { ok: false, message: 'State is required.' };
  }
  if (pincode.length !== 6) {
    return { ok: false, message: 'PIN code must be exactly 6 digits.' };
  }

  const data: ValidatedProfileData = {
    name,
    adhaarNumber,
    phoneNumber,
    address,
    country,
    city,
    state,
    pincode,
  };
  if (role) {
    data.role = role;
  }

  return { ok: true, data };
};
