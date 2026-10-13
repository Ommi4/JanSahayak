const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const aiService = require('../services/ai/aiService');

const allowedLanguages = ['en', 'hi', 'te', 'english', 'hindi', 'telugu'];

// @desc    Create a new conversation
// @route   POST /api/conversations
// @access  Private
const createConversation = async (req, res, next) => {
  try {
    const { language, title } = req.body;

    if (language && !allowedLanguages.includes(String(language).toLowerCase().trim())) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported language. Allowed languages: en, hi, te',
      });
    }

    const conversation = await Conversation.create({
      user: req.user._id,
      title: title || 'New Conversation',
      language: language || req.user.preferredLanguage || 'en',
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all conversations for authenticated user
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single conversation and its messages
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid conversation ID format: ${id}`,
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: `Conversation not found: ${id}`,
      });
    }

    // Verify ownership
    if (conversation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to access this conversation',
      });
    }

    const messages = await Message.find({ conversation: id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message within a conversation and receive AI assistance
// @route   POST /api/conversations/:id/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid conversation ID format: ${id}`,
      });
    }

    // Message validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and cannot be empty',
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds maximum allowed length of 2000 characters',
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: `Conversation not found: ${id}`,
      });
    }

    // Verify ownership
    if (conversation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to send messages to this conversation',
      });
    }

    // 1. Save user message
    const userMessage = await Message.create({
      conversation: conversation._id,
      user: req.user._id,
      sender: 'user',
      content: message.trim(),
    });

    // 2. Generate AI response
    let aiResponse;
    try {
      aiResponse = await aiService.generateResponse({
        message: userMessage.content,
        user: req.user,
        conversation,
        language: conversation.language,
      });
    } catch (aiError) {
      if (aiError.statusCode) {
        return res.status(aiError.statusCode).json({
          success: false,
          message: aiError.message,
        });
      }
      throw aiError;
    }

    // 3. Save assistant message
    const assistantMessage = await Message.create({
      conversation: conversation._id,
      user: null,
      sender: 'assistant',
      content: aiResponse.text,
      metadata: {
        intent: aiResponse.intent,
        schemes: aiResponse.schemes,
        eligibility: aiResponse.eligibility,
        missingFields: aiResponse.missingFields,
        provider: aiResponse.provider,
        language: aiResponse.language,
      },
    });

    // Update conversation title if default
    if (conversation.title === 'New Conversation') {
      const newTitle = userMessage.content.slice(0, 40);
      conversation.title = newTitle.length === 40 ? `${newTitle}...` : newTitle;
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        structured: aiResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
};
