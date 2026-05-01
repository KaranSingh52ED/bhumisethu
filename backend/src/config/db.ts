import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';

// Force Google DNS to resolve MongoDB Atlas SRV records — local ISP DNS
// servers sometimes actively refuse SRV lookups (ECONNREFUSED).
// Safe to keep on Render/cloud since their DNS handles it correctly either way.
dns.setServers(['8.8.8.8', '1.1.1.1']);

export const connectToDatabase = async (): Promise<void> => {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is missing in backend environment.');
  }

  // Mongoose caches connections. In Vercel serverless warm invocations the
  // TCP socket is already open, so we skip the handshake entirely.
  if (mongoose.connection.readyState !== 0) return;

  await mongoose.connect(env.mongoUri);
};
