import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/socketHandler.js';
import { resourceReservationService } from './services/ResourceReservationService.js';
import { User } from './models/User.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect database
  await connectDB();

  // If database is empty, automatically seed demonstration data
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('[Startup] Database is empty. Running auto-seed for demo environment...');
    const { default: seedScript } = await import('./utils/autoSeed.js');
    await seedScript();
  }

  const server = http.createServer(app);

  // Initialize Socket.io
  initSocket(server);

  // Schedule periodic cleanup of expired temporary resource reservations every 30 seconds
  setInterval(async () => {
    try {
      await resourceReservationService.checkAndReleaseExpiredReservations();
    } catch (err) {
      console.error('[Reservation Cron] Error checking expired reservations:', err.message);
    }
  }, 30000);

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 SMART HEALTHCARE ACCESS PLATFORM (SHAP) BACKEND`);
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📡 WebSocket server ready for Emergency Beep`);
    console.log(`=======================================================`);
  });
};

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
