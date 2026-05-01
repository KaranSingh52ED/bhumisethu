import mongoose from 'mongoose';
import { env } from './env';

export const connectToDatabase = async (): Promise<void> => {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is missing in backend environment.');
  }

  // Mongoose caches connections. In Vercel serverless warm invocations the
  // TCP socket is already open, so we skip the handshake entirely.
  if (mongoose.connection.readyState !== 0) return;

  await mongoose.connect(env.mongoUri);
};
