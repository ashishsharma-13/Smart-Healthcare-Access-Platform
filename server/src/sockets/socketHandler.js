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
        // Allow unauthenticated guest connections to public emergency tracking rooms if authorized by request id
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health');
      const user = await userRepository.findById(decoded.id);
      if (user && user.isActive) {
        socket.user = user;
        if (user.role === 'organization') {
          const org = await organizationRepository.findByUserId(user._id);
          socket.organization = org;
        }
      }
      next();
    } catch (err) {
      console.warn('[Socket Auth] Token verification failed:', err.message);
      // Still proceed with socket.user = null for guest tracking
      socket.user = null;
      next();
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}, User: ${socket.user?.name || 'Guest'} (${socket.user?.role || 'Guest'})`);

    // Auto-join organization room if user is an organization
    if (socket.organization) {
      const orgRoom = `org:${socket.organization._id}`;
      socket.join(orgRoom);
      console.log(`[Socket] Organization joined room: ${orgRoom}`);
    }

    // Join emergency room for updates on a specific emergency request
    socket.on('emergency:subscribe', ({ emergencyRequestId }) => {
      if (emergencyRequestId) {
        const room = `emergency:${emergencyRequestId}`;
        socket.join(room);
        console.log(`[Socket] ${socket.id} subscribed to ${room}`);
      }
    });

    socket.on('emergency:unsubscribe', ({ emergencyRequestId }) => {
      if (emergencyRequestId) {
        const room = `emergency:${emergencyRequestId}`;
        socket.leave(room);
        console.log(`[Socket] ${socket.id} left ${room}`);
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

