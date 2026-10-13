const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGODB_URI) => {
  try {
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // If not in a test environment, exit with failure
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed successfully');
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
