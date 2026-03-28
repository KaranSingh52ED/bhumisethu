import type {
  AuthUser,
  DashboardResponse,
  RegistrationProfilePayload,
  UserRole,
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const rolePathMap: Record<UserRole, string> = {
  builder: 'builder',
  land_owner: 'land-owner',
  admin: 'admin',
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed.');
  }
  return data;
};

export const googleLogin = async (idToken: string): Promise<{ token: string; user: AuthUser }> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  return parseJson<{ token: string; user: AuthUser }>(response);
};

export const getCurrentUser = async (token: string): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ user: AuthUser }>(response);
  return data.user;
};

export const completeRegistrationProfile = async (
  token: string,
  payload: RegistrationProfilePayload,
): Promise<{ token: string; user: AuthUser }> => {
  const body: Record<string, string> = {
    name: payload.name,
    adhaarNumber: payload.adhaarNumber,
    phoneNumber: payload.phoneNumber,
    address: payload.address,
    country: payload.country,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
  };
  if (payload.role) {
    body.role = payload.role;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson<{ token: string; user: AuthUser }>(response);
};

export const getDashboardData = async (
  token: string,
  role: UserRole,
): Promise<DashboardResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/${rolePathMap[role]}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<DashboardResponse>(response);
};

export const fetchPendingVerificationUsers = async (
  token: string,
): Promise<{ users: AuthUser[] }> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/admin/pending-users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<{ users: AuthUser[] }>(response);
};

export const approveUserByGoogleId = async (
  token: string,
  googleId: string,
): Promise<{ message: string; user: AuthUser }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/admin/approve-user/${encodeURIComponent(googleId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseJson<{ message: string; user: AuthUser }>(response);
};
