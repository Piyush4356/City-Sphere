const Feedback = require('../models/Feedback');
const { sendEmail } = require('../utils/sendEmail');
const User = require('../models/User');

// POST /api/feedback/submit
exports.submitFeedback = async (req, res) => {
    try {
        const { type, category, content, rating, cityName } = req.body;
        
        if (!type || !category || !content || !cityName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const isExp = type === 'experience';
        
        const newFeedback = new Feedback({
            user: req.user._id,
            cityName,
            type,
            category,
            content,
            rating,
            isVerified: isExp || type === 'suggestion' // Community feedback is public immediately
        });

        await newFeedback.save();

        if (!isExp) {
            // Only send admin email for complaints/suggestions that need verification
            try {
                await sendEmail({
                    email: process.env.ADMIN_EMAIL,
                    subject: `New ${type} reported in ${cityName}`,
                    message: `
                        <h3>New Report Received</h3>
                        <p><strong>Type:</strong> ${type}</p>
                        <p><strong>Category:</strong> ${category}</p>
                        <p><strong>Description:</strong> ${content}</p>
                        <p><strong>User ID:</strong> ${req.user._id}</p>
                        <p>Please verify this report to show it on the public tracking status.</p>
                    `
                });
            } catch (mailErr) {
                console.error('Admin Email failed:', mailErr);
            }
        }

        res.status(201).json({ 
            message: isExp 
                ? 'Experience shared successfully!' 
                : 'Report submitted and pending admin verification. You will receive an email confirmation.' 
        });

        // Send Confirmation Email to User (fire-and-forget, response already sent above)
        try {
            await sendEmail({
                email: req.user.email,
                subject: 'Report Received - City Sphere',
                message: `
                    <h3>Hello ${req.user.name},</h3>
                    <p>We have received your ${type} regarding <strong>${category}</strong>.</p>
                    <p>Our admins are currently verifying the details. Once verified, it will appear on your track status dashboard.</p>
                    <p>Thank you for contributing to a smarter city!</p>
                `
            });
        } catch (mailErr) {
            console.error('User Email failed:', mailErr);
        }


    } catch (error) {
        console.error('Feedback submit error:', error);
        res.status(500).json({ message: 'Server error submitting feedback' });
    }
};

// GET /api/feedback/my
exports.getMyFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ 
            user: req.user._id
        }).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Fetch my feedback error:', error);
        res.status(500).json({ message: 'Server error fetching your feedback' });
    }
};

// GET /api/feedback/city/:cityName
// Public city-wide feed of verified reports
exports.getCityVerifiedFeedback = async (req, res) => {
    try {
        const { cityName } = req.params;
        const feedbacks = await Feedback.find({ 
            cityName,
            isVerified: true 
        })
        .populate('user', 'name dp')
        .sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Fetch city feedback error:', error);
        res.status(500).json({ message: 'Server error fetching city feedback' });
    }
};

// GET /api/feedback/admin/pending
exports.getPendingFeedback = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const feedbacks = await Feedback.find({ isVerified: false })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Fetch pending feedback error:', error);
        res.status(500).json({ message: 'Server error fetching pending reports' });
    }
};

// DELETE /api/feedback/:id
// User can delete their OWN pending feedback only
exports.deleteFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Ensure the requesting user owns this feedback
        if (feedback.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorised to delete this feedback' });
        }

        // Only allow deletion of pending items — resolved/escalated items are civic records
        if (feedback.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending feedback can be deleted' });
        }

        await feedback.deleteOne();
        res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ message: 'Server error deleting feedback' });
    }
};

// GET /api/feedback/stats/:cityName
exports.getCityStats = async (req, res) => {
    try {
        const { cityName } = req.params;
        
        const stats = await Feedback.aggregate([
            { $match: { cityName, type: 'experience', isVerified: true } },
            { 
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            res.json({
                averageRating: stats[0].averageRating,
                totalRatings: stats[0].totalRatings
            });
        } else {
            res.json({ averageRating: 0, totalRatings: 0 });
        }
    } catch (error) {
        console.error('Fetch city stats error:', error);
        res.status(500).json({ message: 'Server error fetching city stats' });
    }
};

// GET /api/feedback/summary/:cityName
exports.getCitySummary = async (req, res) => {
    try {
        const { cityName } = req.params;
        
        const sortedAggregation = await Feedback.aggregate([
            { $match: { cityName, type: 'complaint', isVerified: true } },
            { $sort: { createdAt: 1 } },
            {
                $group: {
                    _id: { category: '$category', status: '$status' },
                    count: { $sum: 1 },
                    lastUpdate: { $max: '$updatedAt' },
                    lastReport: { $last: '$content' }
                }
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id.category',
                    status: '$_id.status',
                    count: 1,
                    lastUpdate: 1,
                    lastReport: 1
                }
            }
        ]);

        res.json(sortedAggregation);
    } catch (error) {
        console.error('Fetch city summary error:', error);
        res.status(500).json({ message: 'Server error fetching city summary' });
    }
};

// PUT /api/feedback/admin/resolve
// Admin marks all complaints in a city+category as resolved
exports.adminResolveFeedback = async (req, res) => {
    try {
        // Only admins can call this
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { cityName, category } = req.body;

        if (!cityName || !category) {
            return res.status(400).json({ message: 'cityName and category are required' });
        }

        const result = await Feedback.updateMany(
            { cityName, category, type: 'complaint', status: { $in: ['pending', 'resolution'] } },
            { $set: { status: 'resolved' } }
        );

        res.json({ 
            message: `Marked ${result.modifiedCount} reports as resolved`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Admin resolve error:', error);
        res.status(500).json({ message: 'Server error resolving feedback' });
    }
};

// @desc    Admin verify a single feedback
// @route   PUT /api/feedback/admin/verify/:id
exports.adminVerifyFeedback = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const feedback = await Feedback.findById(req.params.id).populate('user');
        if (!feedback) {
            return res.status(404).json({ message: 'Report not found' });
        }

        feedback.isVerified = true;
        await feedback.save();

        // Notify User that their problem is "taken" and showing on track status
        try {
            await sendEmail({
                email: feedback.user.email,
                subject: 'Report Verified & Active - City Sphere',
                message: `
                    <h3>Great news, ${feedback.user.name}!</h3>
                    <p>Your report about <strong>${feedback.category}</strong> has been verified and is now <strong>Active</strong>.</p>
                    <p>You can now track its progress in your Profile's Activity Timeline.</p>
                `
            });
        } catch (mailErr) {
            console.error('Verification email failed:', mailErr);
        }

        res.json({ message: 'Feedback verified successfully', feedback });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ message: 'Server error verifying feedback' });
    }
};

// @desc    Toggle star on a suggestion
// @route   PATCH /api/feedback/star/:id
exports.starFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

        if (!feedback.stars) feedback.stars = [];
        
        const userId = req.user._id;
        const index = feedback.stars.findIndex(id => id.toString() === userId.toString());

        if (index === -1) {
            feedback.stars.push(userId);
        } else {
            feedback.stars.splice(index, 1);
        }

        feedback.starCount = feedback.stars.length;
        await feedback.save();

        res.json({ 
            starCount: feedback.starCount, 
            isStarred: index === -1 
        });
    } catch (error) {
        console.error('Star toggle error:', error);
        res.status(500).json({ message: 'Server error starring feedback' });
    }
};

// @desc    Get top highlighted suggestions for dashboard
// @route   GET /api/feedback/top-suggestions/:cityName
exports.getTopSuggestions = async (req, res) => {
    try {
        const { cityName } = req.params;
        const suggestions = await Feedback.find({ 
            cityName, 
            type: 'suggestion',
            isVerified: true 
        })
        .populate('user', 'name dp')
        .sort({ starCount: -1, createdAt: -1 })
        .limit(3);

        res.json(suggestions);
    } catch (error) {
        console.error('Fetch top suggestions error:', error);
        res.status(500).json({ message: 'Server error fetching highlighted suggestions' });
    }
};
