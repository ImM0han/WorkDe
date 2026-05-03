import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import {
  addPartnerToPool,
  updatePartnerLocation,
  removePartnerFromPool,
} from '../services/geoService';
import { sendPushNotification } from '../services/pushService';

interface AuthPayload { userId: string; role: 'PARTNER' | 'CLIENT'; }

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.SOCKET_CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
    transports: ['websocket'],
  });

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;

      if (payload.role === 'PARTNER') {
        const partner = await prisma.partner.findUnique({ where: { userId: payload.userId } });
        if (!partner) return next(new Error('Partner not found'));
        socket.data.partnerId = partner.id;
      }
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const { userId, role, partnerId } = socket.data;

    // Every user joins their personal room
    socket.join(`user:${userId}`);
    if (partnerId) socket.join(`partner:${partnerId}`);

    // ── PARTNER EVENTS ───────────────────────────────────────────────────────

    socket.on('partner:online', async ({ lat, lng }: { lat: number; lng: number }) => {
      if (role !== 'PARTNER' || !partnerId) return;
      await addPartnerToPool(partnerId, lat, lng);
      await prisma.partner.update({
        where: { id: partnerId },
        data: { isOnline: true, lastLat: lat, lastLng: lng },
      });
    });

    socket.on('partner:location', async ({ lat, lng }: { lat: number; lng: number }) => {
      if (role !== 'PARTNER' || !partnerId) return;
      await updatePartnerLocation(partnerId, lat, lng);
      await prisma.partner.update({
        where: { id: partnerId },
        data: { lastLat: lat, lastLng: lng },
      });

      // Forward to client if there's an active job
      const activeJob = await prisma.job.findFirst({
        where: { partnerId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
      });
      if (activeJob) {
        io.to(`user:${activeJob.clientId}`).emit('partner:location', { lat, lng, partnerId });
      }
    });

    socket.on('partner:offline', async () => {
      if (role !== 'PARTNER' || !partnerId) return;
      await removePartnerFromPool(partnerId);
      await prisma.partner.update({ where: { id: partnerId }, data: { isOnline: false } });
    });

    socket.on('disconnect', async () => {
      if (role === 'PARTNER' && partnerId) {
        await removePartnerFromPool(partnerId);
        await prisma.partner.update({ where: { id: partnerId }, data: { isOnline: false } });
      }
    });

    // ── EXTENSION EVENTS ─────────────────────────────────────────────────────

    socket.on('job:extend:response', async ({ jobId, accepted }: { jobId: string; accepted: boolean }) => {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return;
      io.to(`user:${job.clientId}`).emit('extension:response', { jobId, accepted, job });
    });

    // ── CHAT ─────────────────────────────────────────────────────────────────

    socket.on('chat:send', async ({ jobId, text, imageUrl }: { jobId: string; text?: string; imageUrl?: string }) => {
      const message = await prisma.message.create({
        data: { jobId, senderId: userId, text, imageUrl },
        include: { sender: { select: { name: true, avatarUrl: true } } },
      });
      io.to(`job:${jobId}:chat`).emit('chat:message', message);
    });

    socket.on('chat:join', ({ jobId }: { jobId: string }) => {
      socket.join(`job:${jobId}:chat`);
    });
  });

  return io;
}

// Export for use in route handlers
let _io: Server;
export const getIO = () => _io;
export const setIO = (io: Server) => { _io = io; };
