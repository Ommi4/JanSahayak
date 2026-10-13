const express = require('express');
const router = express.Router();
const {
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');

// All conversation endpoints are protected by JWT authentication
router.use(protect);

router.post('/', createConversation);
router.get('/', getConversations);
router.get('/:id', getConversationById);
router.post('/:id/messages', sendMessage);

module.exports = router;
