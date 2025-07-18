const mongoose = require('mongoose');

const thumbnailUpdateSchema = new mongoose.Schema({
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
  canvaDesignId: {
    type: String,
    required: true
  },
  canvaTemplateId: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'created', 'uploaded', 'failed'],
    default: 'pending'
  },
  videoType: {
    type: String,
    enum: ['weekly_forecast', 'bonus_video', 'livestream', 'regular'],
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  // Track what text was added to the thumbnail
  customText: {
    title: String,
    subtitle: String,
    zodiacSign: String
  },
  // Automation metadata
  automationStats: {
    processingTimeMs: Number,
    canvaApiCalls: Number,
    youtubeApiCalls: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
thumbnailUpdateSchema.index({ status: 1, lastUpdated: 1 });
thumbnailUpdateSchema.index({ videoType: 1 });
thumbnailUpdateSchema.index({ retryCount: 1, status: 1 });

module.exports = mongoose.model('ThumbnailUpdate', thumbnailUpdateSchema); 