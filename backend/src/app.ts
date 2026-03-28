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

app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
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
