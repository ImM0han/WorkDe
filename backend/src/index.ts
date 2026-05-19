import express from 'express';
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
import { initSocket, setIO } from './socket';

dotenv.config({ path: '.env.local' });

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

// Routes
app.use('/auth', authRoutes);
app.use('/jobs', jobRoutes);
app.use('/wallet', walletRoutes);
app.use('/partner', partnerRoutes);
app.use('/payments', paymentRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/aadhaar', aadhaarRoutes);
app.use('/disputes', disputeRoutes);
app.use('/client', clientRoutes);
app.use('/addresses', addressRoutes);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
