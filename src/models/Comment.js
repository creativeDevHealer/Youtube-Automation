const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  videoId: {
    type: String,
    required: true,
    index: true
  },
  authorChannelId: {
    type: String,
    required: true
  },
  authorDisplayName: String,
  authorProfileImageUrl: String,
  textDisplay: {
    type: String,
    required: true
  },
  textOriginal: String,
  likeCount: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    required: true
  },
  updatedAt: Date,
  
  // Member status
  memberStatus: {
    type: String,
    enum: ['none', 'tier1', 'tier2', 'tier3'],
    default: 'none'
  },
  memberBadge: {
    text: String,
    color: String
  },
  
  // Sentiment analysis
  sentiment: {
    score: Number, // -1 to 1
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    confidence: Number
  },
  
  // Keyword detection
  detectedKeywords: [{
    keyword: String,
    category: {
      type: String,
      enum: ['milestone', 'negative', 'troll', 'superfan', 'ruby', 'alert', 'praise', 'special']
    },
    context: String
  }],
  
  // Automation actions
  automationActions: [{
    action: {
      type: String,
      enum: ['liked', 'replied', 'deleted', 'flagged', 'alerted', 'flagged_only', 'delete_failed', 'like_skipped', 'like_failed', 'reply_failed', 'error']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String,
    responseText: String,
    gptPrompt: String
  }],
  
  // Toxicity detection
  toxicity: {
    score: Number,
    flagged: {
      type: Boolean,
      default: false
    },
    reasons: [String]
  },
  
  // Superfan tracking
  superfanScore: {
    type: Number,
    default: 0
  },
  isSuperfan: {
    type: Boolean,
    default: false
  },
  
  // Processing status
  processed: {
    type: Boolean,
    default: false
  },
  processingErrors: [String],
  
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
commentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
commentSchema.index({ videoId: 1, publishedAt: -1 });
commentSchema.index({ memberStatus: 1 });
commentSchema.index({ 'sentiment.label': 1 });
commentSchema.index({ 'automationActions.action': 1 });
commentSchema.index({ processed: 1 });

module.exports = mongoose.model('Comment', commentSchema); 