export type UserRole = 'builder' | 'land_owner' | 'admin';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  adhaarNumber: string;
  phoneNumber: string;
  address: string;
  country: string;
  city: string;
  state: string;
  pincode: string;
  picture?: string;
  role: UserRole;
  isApproved: boolean;
  registrationComplete: boolean;
  iat?: number;
  exp?: number;
}
