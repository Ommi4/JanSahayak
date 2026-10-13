const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`JanSahayak server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server if file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
