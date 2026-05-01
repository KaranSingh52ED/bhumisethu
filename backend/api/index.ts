/**
 * Vercel serverless entry point.
 *
 * On a cold start Vercel spins up a new Node VM. We connect to MongoDB here
 * so it is ready before the first request is handled. Mongoose caches the
 * connection, so warm invocations skip the TCP handshake entirely.
 */
import { app } from '../src/app';
import { connectToDatabase } from '../src/config/db';

// Initiate DB connection at module load time (cold-start).
// Subsequent warm invocations reuse the cached Mongoose connection.
connectToDatabase().catch((err: unknown) => {
  console.error('[Vercel] DB connection failed on cold start:', err);
});

export default app;
