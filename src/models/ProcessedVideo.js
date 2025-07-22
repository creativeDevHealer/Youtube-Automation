const mongoose = require('mongoose');

const processedVideoSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  videoTitle: {
    type: String,
    required: true
  },
  videoType: {
    type: String,
    required: true,
    enum: ['bonus_video', 'weekly_forecast', 'livestream', 'regular']
  },
  finalDescription: {
    type: String,
    default: ''
  },
  zodiacSign: {
    type: String,
    default: ''
  },
  timestamps: {
    type: String,
    default: ''
  },
  weekRange: {
    type: String,
    default: ''
  },
  pinnedComment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
processedVideoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ProcessedVideo', processedVideoSchema); 