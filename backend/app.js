const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JanSahayak API is running',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
