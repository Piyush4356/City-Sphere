const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

// Support ticket endpoint - requires auth to get user email
router.post('/support', protect, chatbotController.submitSupportTicket);

module.exports = router;
