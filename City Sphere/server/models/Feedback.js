const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cityName: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['complaint', 'suggestion', 'ease_of_living', 'experience']
    },
    category: {
        type: String,
        required: true,
        enum: ['transport', 'healthcare', 'waste', 'water', 'infrastructure', 'other']
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'resolution', 'resolved']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    stars: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    starCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
