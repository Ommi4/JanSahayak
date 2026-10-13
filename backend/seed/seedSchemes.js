const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');
const { connectDB, disconnectDB } = require('../config/db');

const seedSchemes = async (customUri) => {
  try {
    const mongoUri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jansahayak';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}`);
    await connectDB(mongoUri);

    const datasetPath = path.join(__dirname, '..', '..', 'dataset', 'schemes.json');
    if (!fs.existsSync(datasetPath)) {
      throw new Error(`Dataset file not found at ${datasetPath}`);
    }

    const rawData = fs.readFileSync(datasetPath, 'utf8');
    const schemesData = JSON.parse(rawData);

    console.log(`[Seed] Loaded ${schemesData.length} verified schemes from dataset`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of schemesData) {
      const existing = await Scheme.findOne({ schemeName: item.schemeName });
      if (existing) {
        await Scheme.updateOne({ _id: existing._id }, { $set: item });
        updatedCount++;
      } else {
        await Scheme.create(item);
        insertedCount++;
      }
    }

    console.log(`[Seed] Completed successfully! Inserted: ${insertedCount}, Updated: ${updatedCount}, Total: ${schemesData.length}`);
    await disconnectDB();
    return { insertedCount, updatedCount, total: schemesData.length };
  } catch (error) {
    console.error(`[Seed] Error seeding schemes: ${error.message}`);
    await disconnectDB();
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

// If run directly from CLI
if (require.main === module) {
  seedSchemes().then(() => {
    process.exit(0);
  });
}

module.exports = { seedSchemes };
