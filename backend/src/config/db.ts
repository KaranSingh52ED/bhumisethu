import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export const connectToDatabase = async (): Promise<void> => {
  if (!env.mongoUri) {
    throw new Error('MONGO_URI is missing in backend environment.');
  }

  await mongoose.connect(env.mongoUri);
};
