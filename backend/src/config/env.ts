import dotenv from 'dotenv';

dotenv.config();

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  port: parsePort(process.env.PORT, 8080),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  mongoUri: process.env.MONGO_URI ?? '',
};
