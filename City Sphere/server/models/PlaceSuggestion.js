const mongoose = require('mongoose');

const placeSuggestionSchema = new mongoose.Schema({
  submittedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['attraction', 'monument', 'museum', 'park', 'nature', 'fort'],
    required: true 
  },
  cityName: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  description: { type: String, maxlength: 300 },
  imageUrl: { type: String },        // Cloudinary URL after upload
  imagePublicId: { type: String },   // needed to delete from Cloudinary if rejected
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: { type: String },       // reason if rejected
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('PlaceSuggestion', placeSuggestionSchema);
