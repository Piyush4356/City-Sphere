const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @desc    Toggle save/unsave a place
// @route   PUT /api/places/save
// @access  Private
router.put('/save', protect, async (req, res) => {
    try {
        const { placeId, name, type, lat, lon } = req.body;

        if (!placeId || !name) {
            return res.status(400).json({ message: 'placeId and name are required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if place is already saved
        const existingIndex = user.savedPlaces.findIndex(p => p.placeId === placeId);

        if (existingIndex > -1) {
            // Already saved → remove it (unsave)
            user.savedPlaces.splice(existingIndex, 1);
            await user.save();
            return res.json({ message: 'Place removed from saved', saved: false, savedPlaces: user.savedPlaces });
        } else {
            // Not saved → add it
            user.savedPlaces.push({ placeId, name, type, lat, lon });
            await user.save();
            return res.json({ message: 'Place saved', saved: true, savedPlaces: user.savedPlaces });
        }
    } catch (error) {
        console.error('Save Place Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Get all saved places for current user
// @route   GET /api/places/saved
// @access  Private
router.get('/saved', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('savedPlaces');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.savedPlaces);
    } catch (error) {
        console.error('Get Saved Places Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
