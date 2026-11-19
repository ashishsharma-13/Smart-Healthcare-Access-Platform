import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/index.js';
import autoSeed from '../src/utils/autoSeed.js';
import { seedDemoAccounts } from '../src/utils/seedDemoAccounts.js';

dotenv.config();

const outputPath = new URL('../all-users-export.json', import.meta.url);

try {
  await connectDB();
  await autoSeed();
  await seedDemoAccounts();

  const users = await User.find({}).select('+password').sort({ role: 1, name: 1 }).lean();
  const rows = await Promise.all(users.map(async (user) => {
    let passwordStatus = 'Password not retrievable — reset required';
    if (await bcrypt.compare('ShapDemo@2026', user.password)) {
      passwordStatus = 'ShapDemo@2026';
    } else if (await bcrypt.compare('password123', user.password)) {
      passwordStatus = 'password123';
    }

    return {
      databaseId: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || '',
      isActive: user.isActive !== false ? 'Yes' : 'No',
      password: passwordStatus,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
    };
  }));

  await fs.writeFile(outputPath, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`Exported ${rows.length} users to ${outputPath.pathname}`);
} finally {
  await disconnectDB();
}
