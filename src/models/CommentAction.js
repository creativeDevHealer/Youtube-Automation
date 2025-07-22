const mongoose = require('mongoose');

const commentActionSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    index: true
  },
  videoTitle: {
    type: String,
    required: true
  },
  commentId: {
    type: String,
    required: true,
    index: true
  },
  commentText: {
    type: String,
    required: true
  },
  repliedComment: {
    type: String,
    default: null // Only populated for 'replied' actions
  },
  processedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    enum: ['deleted', 'replied'],
    index: true
  },
  
  // Additional metadata for better tracking
  authorDisplayName: String,
  authorChannelId: String,
  memberStatus: {
    type: String,
    enum: ['none', 'tier1', 'tier2', 'tier3'],
    default: 'none'
  },
  
  reason: String, // Reason for the action
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
commentActionSchema.index({ videoId: 1, processedAt: -1 });
commentActionSchema.index({ commentId: 1, actionType: 1 });
commentActionSchema.index({ actionType: 1, processedAt: -1 });
commentActionSchema.index({ authorChannelId: 1, processedAt: -1 });

// Create a compound unique index to prevent duplicate actions on the same comment
commentActionSchema.index({ commentId: 1, actionType: 1 }, { unique: true });

module.exports = mongoose.model('CommentAction', commentActionSchema); 