import express, { Router } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import walletRoutes from './routes/wallet';
import partnerRoutes from './routes/partner';
import paymentRoutes from './routes/payments';
import feedbackRoutes from './routes/feedback';
import aadhaarRoutes from './routes/aadhaar';
import disputeRoutes from './routes/disputes';
import clientRoutes from './routes/client';
import addressRoutes from './routes/addresses';
import adminRoutes from './routes/admin';
import { initSocket, setIO } from './socket';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});

const app = express();
const httpServer = createServer(app);

const io = initSocket(httpServer);
setIO(io);

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Router for API endpoints
const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/jobs', jobRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/partner', partnerRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/feedback', feedbackRoutes);
apiRouter.use('/aadhaar', aadhaarRoutes);
apiRouter.use('/disputes', disputeRoutes);
apiRouter.use('/client', clientRoutes);
apiRouter.use('/addresses', addressRoutes);
apiRouter.use('/ops-console', adminRoutes);

// Mount router at both root AND /api/v1 prefix to prevent URL prefix mismatches
app.use('/api/v1', apiRouter);
app.use('/', apiRouter);

// 404 Fallback JSON handler (Prevents HTML "Cannot GET" responses)
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint '${req.method} ${req.originalUrl}' not found on backend server` });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
