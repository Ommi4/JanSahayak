const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Sender is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual aliases
messageSchema.virtual('conversationId').get(function () {
  return this.conversation;
});
messageSchema.virtual('role').get(function () {
  return this.sender;
});

module.exports = mongoose.model('Message', messageSchema);
