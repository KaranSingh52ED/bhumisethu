import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { landDocumentsRouter } from './routes/land-documents.routes';
import { listingRouter } from './routes/listing.routes';

const app = express();

// Support comma-separated list of allowed origins so both localhost and the
// production URL work from a single env var, e.g.:
//   FRONTEND_ORIGIN=https://bhumisethu.vercel.app,http://localhost:5173
const allowedOrigins = env.frontendOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server).
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
};

// Handle OPTIONS preflight explicitly before any other middleware.
app.options('*', cors(corsOptions));
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/land-documents', landDocumentsRouter);
app.use('/api/listings', listingRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export { app };
