export type UserRole = 'builder' | 'land_owner' | 'admin';
export type SignupRole = 'builder' | 'land_owner';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  isApproved: boolean;
  registrationComplete: boolean;
  adhaarNumber: string;
  phoneNumber: string;
  address: string;
  country: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RegistrationProfilePayload {
  /** Omit for admin accounts (role fixed in database). */
  role?: SignupRole;
  name: string;
  adhaarNumber: string;
  phoneNumber: string;
  address: string;
  country: string;
  city: string;
  state: string;
  pincode: string;
}

export interface DashboardResponse {
  role: UserRole;
  welcome: string;
}
