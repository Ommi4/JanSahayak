const mongoose = require('mongoose');

const savedSchemeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: [true, 'Scheme reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate saving of the same scheme by the same user
savedSchemeSchema.index({ user: 1, scheme: 1 }, { unique: true });

// Virtual aliases
savedSchemeSchema.virtual('userId').get(function () {
  return this.user;
});
savedSchemeSchema.virtual('schemeId').get(function () {
  return this.scheme;
});

module.exports = mongoose.model('SavedScheme', savedSchemeSchema);
