const express = require('express');
const router = express.Router();
const { 
    submitFeedback, 
    getMyFeedback,
    deleteFeedback,
    getCityStats, 
    getCitySummary,
    getCityVerifiedFeedback,
    getPendingFeedback,
    adminResolveFeedback,
    adminVerifyFeedback,
    starFeedback,
    getTopSuggestions
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

router.post('/submit', protect, submitFeedback);
router.get('/my', protect, getMyFeedback);
router.get('/city/:cityName', getCityVerifiedFeedback);
router.get('/admin/pending', protect, getPendingFeedback);
router.delete('/:id', protect, deleteFeedback);          // user deletes own pending feedback
router.get('/stats/:cityName', getCityStats);
router.get('/summary/:cityName', getCitySummary);
router.put('/admin/resolve', protect, adminResolveFeedback); // admin marks category as resolved
router.put('/admin/verify/:id', protect, adminVerifyFeedback); // admin approves a report
router.patch('/star/:id', protect, starFeedback);
router.get('/top-suggestions/:cityName', getTopSuggestions);

module.exports = router;
