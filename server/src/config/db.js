import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongodInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shap_platform';
  
  try {
    // Attempt standard connection with 2.5s timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] Connected to external MongoDB at ${uri}`);
  } catch (err) {
    console.log(`[Database] External MongoDB not reached (${err.message}). Starting MongoMemoryServer...`);
    try {
      mongodInstance = await MongoMemoryServer.create();
      const inMemoryUri = mongodInstance.getUri();
      await mongoose.connect(inMemoryUri);
      console.log(`[Database] In-memory MongoDB started successfully at ${inMemoryUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to start MongoMemoryServer:', memErr);
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('[Database] MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

