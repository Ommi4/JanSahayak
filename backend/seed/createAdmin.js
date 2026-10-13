const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../models/User');
const { connectDB, disconnectDB } = require('../config/db');

const createAdminUser = async (customUri) => {
  try {
    const mongoUri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jansahayak';
    console.log(`[Admin Seed] Connecting to MongoDB: ${mongoUri}`);
    await connectDB(mongoUri);

    const adminName = process.env.ADMIN_NAME || 'JanSahayak Admin';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@JanSahayak2026!';
    const adminLang = process.env.ADMIN_LANGUAGE || 'English';

    const existingUser = await User.findOne({ email: adminEmail });

    if (existingUser) {
      if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`[Admin Seed] Updated existing user ${adminEmail} to admin role.`);
      } else {
        console.log(`[Admin Seed] Admin user ${adminEmail} already exists.`);
      }
      await disconnectDB();
      return existingUser;
    }

    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      preferredLanguage: adminLang,
    });

    console.log(`[Admin Seed] Created new administrator user: ${adminEmail}`);
    await disconnectDB();
    return newAdmin;
  } catch (error) {
    console.error(`[Admin Seed] Error bootstrapping admin user: ${error.message}`);
    await disconnectDB();
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

// If run directly from CLI
if (require.main === module) {
  createAdminUser().then(() => {
    process.exit(0);
  });
}

module.exports = { createAdminUser };
