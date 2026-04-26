const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/placeSuggestionController');

// multer stores file in memory (buffer) before Cloudinary upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

router.post('/submit', protect, upload.single('image'), ctrl.submitPlace);
router.get('/mine', protect, ctrl.getMySubmissions);
router.get('/approved/:cityName', ctrl.getApproved);
router.get('/admin/pending', protect, adminOnly, ctrl.getPending);
router.get('/admin/history', protect, adminOnly, ctrl.getAdminHistory);
router.patch('/admin/review/:id', protect, adminOnly, ctrl.reviewSuggestion);
router.delete('/admin/:id', protect, adminOnly, ctrl.deleteSuggestion);

module.exports = router;
