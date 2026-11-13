import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/UserRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

let ioInstance = null;

export const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health');
      const user = await userRepository.findById(decoded.id);
      if (user && user.isActive) {
        socket.user = user;
        if (user.role === 'organization' || user.role === 'hospital') {
          const org = await organizationRepository.findByUserId(user._id);
          socket.organization = org;
        }
      }
      next();
    } catch (err) {
      console.warn('[Socket Auth] Token verification failed:', err.message);
      socket.user = null;
      next();
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}, User: ${socket.user?.name || 'Guest'} (${socket.user?.role || 'Guest'})`);

    // Helper to join all hospital room variants
    const joinHospitalRooms = (hospitalId, slug = null) => {
      if (!hospitalId) return;
      const idStr = hospitalId.toString();
      socket.join(idStr);
      socket.join(`org:${idStr}`);
      socket.join(`facility:${idStr}`);
      socket.join(`/topic/organizations/${idStr}/emergency-beeps`);
      if (slug) socket.join(slug.toString());
      console.log(`[Socket] ${socket.id} joined hospital rooms: [${idStr}, org:${idStr}, facility:${idStr}]`);
    };

    // Auto-join user room for private notifications
    if (socket.user) {
      const uId = socket.user._id.toString();
      socket.join(uId);
      socket.join(`user:${uId}`);
      socket.join('/user/queue/notifications');
      console.log(`[Socket] ${socket.id} joined user notification rooms: [${uId}, user:${uId}]`);
    }

    // Auto-join organization room if user is an organization
    if (socket.organization) {
      joinHospitalRooms(socket.organization._id, socket.organization.slug || socket.organization.name);
    }

    // Explicit room join handlers requested by frontend
    socket.on('join-organization', (hospitalId) => {
      joinHospitalRooms(hospitalId);
    });

    socket.on('join-facility-room', (hospitalId) => {
      joinHospitalRooms(hospitalId);
    });

    socket.on('emergency:join_org', ({ organizationId }) => {
      joinHospitalRooms(organizationId);
    });

    // Join emergency room for updates on a specific emergency request
    socket.on('emergency:subscribe', ({ emergencyRequestId }) => {
      if (emergencyRequestId) {
        const idStr = emergencyRequestId.toString();
        socket.join(`emergency:${idStr}`);
        socket.join(`/topic/emergency/${idStr}/responses`);
        socket.join(`/topic/emergency/${idStr}/destination`);
        socket.join(`/topic/emergency/${idStr}/reservation`);
        socket.join(`/topic/emergency/${idStr}/journey`);
        console.log(`[Socket] ${socket.id} subscribed to emergency:${idStr}`);
      }
    });

    socket.on('emergency:unsubscribe', ({ emergencyRequestId }) => {
      if (emergencyRequestId) {
        const idStr = emergencyRequestId.toString();
        socket.leave(`emergency:${idStr}`);
        socket.leave(`/topic/emergency/${idStr}/responses`);
        socket.leave(`/topic/emergency/${idStr}/destination`);
        socket.leave(`/topic/emergency/${idStr}/reservation`);
        socket.leave(`/topic/emergency/${idStr}/journey`);
        console.log(`[Socket] ${socket.id} left emergency:${idStr}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

export const getSocketIO = () => {
  return ioInstance;
};
