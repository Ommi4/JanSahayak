const mongoose = require('mongoose');

const normalizeLanguage = (lang) => {
  if (!lang) return 'en';
  const lower = String(lang).toLowerCase().trim();
  if (lower === 'hi' || lower === 'hindi') return 'hi';
  if (lower === 'te' || lower === 'telugu') return 'te';
  return 'en';
};

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'te', 'English', 'Hindi', 'Telugu'],
      default: 'en',
      set: normalizeLanguage,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual alias for userId to match both conventions
conversationSchema.virtual('userId').get(function () {
  return this.user;
});

module.exports = mongoose.model('Conversation', conversationSchema);
