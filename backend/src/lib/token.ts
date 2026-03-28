import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload } from '../types/auth';

const EXPIRES_IN = '7d';

export const createAuthToken = (payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: EXPIRES_IN });

export const verifyAuthToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
