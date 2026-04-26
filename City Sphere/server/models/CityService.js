const mongoose = require('mongoose');

const cityServiceSchema = new mongoose.Schema({
  cityName: { type: String, required: true, unique: true, index: true },
  waste: {
    days: String,       // e.g. "Mon / Wed / Fri"
    time: String,       // e.g. "07:00 AM"
    zones: Number,      // how many collection zones
    notes: String
  },
  water: {
    timing: String,     // e.g. "06:00 AM - 09:00 AM"
    frequency: String,  // e.g. "Daily" or "Alternate days"
    notes: String
  }
}, { timestamps: true });

module.exports = mongoose.model('CityService', cityServiceSchema);
