const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  profileImageUrl: String,
  
  // Membership details
  membershipLevel: {
    type: String,
    enum: ['none', 'tier1', 'tier2', 'tier3'],
    required: true
  },
  membershipBadge: {
    text: String,
    color: String
  },
  memberSince: {
    type: Date,
    required: true
  },
  
  // Interaction tracking
  totalComments: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  },
  totalReplies: {
    type: Number,
    default: 0
  },
  
  // Sentiment tracking
  averageSentiment: {
    type: Number,
    default: 0
  },
  positiveCommentCount: {
    type: Number,
    default: 0
  },
  negativeCommentCount: {
    type: Number,
    default: 0
  },
  
  // Superfan metrics
  superfanScore: {
    type: Number,
    default: 0
  },
  isSuperfan: {
    type: Boolean,
    default: false
  },
  superfanSince: Date,
  
  // Keyword mentions
  keywordMentions: {
    milestone: { type: Number, default: 0 },
    ruby: { type: Number, default: 0 },
    positive: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    websiteAccess: { type: Number, default: 0 }
  },
  
  // Recent activity
  lastCommentAt: Date,
  lastInteractionAt: Date,
  
  // Engagement metrics
  engagementScore: {
    type: Number,
    default: 0
  },
  
  // Notes for admin
  adminNotes: String,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
memberSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
memberSchema.index({ membershipLevel: 1 });
memberSchema.index({ superfanScore: -1 });
memberSchema.index({ engagementScore: -1 });
memberSchema.index({ lastInteractionAt: -1 });

module.exports = mongoose.model('Member', memberSchema); 