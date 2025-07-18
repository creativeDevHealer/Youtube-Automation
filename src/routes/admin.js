const express = require('express');
const router = express.Router();
const commentAutomation = require('../services/commentAutomation');
const Comment = require('../models/Comment');
const Member = require('../models/Member');
const ThumbnailUpdate = require('../models/ThumbnailUpdate');
const logger = require('../utils/logger');

// Middleware to check admin authentication
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Apply auth middleware to all routes
router.use(requireAuth);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await Comment.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          totalLiked: { $sum: { $size: { $filter: { input: '$automationActions', cond: { $eq: ['$$this.action', 'liked'] } } } } },
          totalReplied: { $sum: { $size: { $filter: { input: '$automationActions', cond: { $eq: ['$$this.action', 'replied'] } } } } },
          totalDeleted: { $sum: { $size: { $filter: { input: '$automationActions', cond: { $eq: ['$$this.action', 'deleted'] } } } } },
          totalAlerted: { $sum: { $size: { $filter: { input: '$automationActions', cond: { $eq: ['$$this.action', 'alerted'] } } } } },
          positiveSentiment: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] } },
          negativeSentiment: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] } },
          memberComments: { $sum: { $cond: [{ $ne: ['$memberStatus', 'none'] }, 1, 0] } }
        }
      }
    ]);

    const superfans = await Member.countDocuments({ isSuperfan: true });
    const totalMembers = await Member.countDocuments({ isActive: true });

    res.json({
      today: stats[0] || {
        totalComments: 0,
        totalLiked: 0,
        totalReplied: 0,
        totalDeleted: 0,
        totalAlerted: 0,
        positiveSentiment: 0,
        negativeSentiment: 0,
        memberComments: 0
      },
      superfans,
      totalMembers
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent comments
router.get('/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('member', 'displayName membershipLevel');

    const total = await Comment.countDocuments();

    res.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting recent comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get superfans
router.get('/superfans', async (req, res) => {
  try {
    const superfans = await Member.find({ isSuperfan: true })
      .sort({ superfanScore: -1 })
      .limit(50);

    res.json(superfans);
  } catch (error) {
    logger.error('Error getting superfans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get members
router.get('/members', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const members = await Member.find({ isActive: true })
      .sort({ lastInteractionAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Member.countDocuments({ isActive: true });

    res.json({
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comment by ID
router.get('/comments/:commentId', async (req, res) => {
  try {
    const comment = await Comment.findOne({ commentId: req.params.commentId });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (error) {
    logger.error('Error getting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually process comments
router.post('/process-comments', async (req, res) => {
  try {
    const result = await commentAutomation.processComments();
    res.json({ success: true, stats: result });
  } catch (error) {
    logger.error('Error manually processing comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate daily report
router.post('/generate-report', async (req, res) => {
  try {
    await commentAutomation.generateDailyReport();
    res.json({ success: true, message: 'Daily report generated and sent' });
  } catch (error) {
    logger.error('Error generating daily report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member notes
router.put('/members/:channelId/notes', async (req, res) => {
  try {
    const { notes } = req.body;
    
    const member = await Member.findOneAndUpdate(
      { channelId: req.params.channelId },
      { adminNotes: notes },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(member);
  } catch (error) {
    logger.error('Error updating member notes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sentiment analysis
router.get('/sentiment-analysis', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sentimentData = await Comment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sentiment: '$sentiment.label'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          sentiments: {
            $push: {
              sentiment: '$_id.sentiment',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(sentimentData);
  } catch (error) {
    logger.error('Error getting sentiment analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get keyword statistics
router.get('/keyword-stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const keywordStats = await Comment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$detectedKeywords'
      },
      {
        $group: {
          _id: {
            keyword: '$detectedKeywords.keyword',
            category: '$detectedKeywords.category'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          keywords: {
            $push: {
              keyword: '$_id.keyword',
              count: '$count'
            }
          }
        }
      }
    ]);

    res.json(keywordStats);
  } catch (error) {
    logger.error('Error getting keyword statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search comments
router.get('/search-comments', async (req, res) => {
  try {
    const { query, sentiment, memberStatus, limit = 20 } = req.query;
    
    const searchCriteria = {};
    
    if (query) {
      searchCriteria.$or = [
        { textDisplay: { $regex: query, $options: 'i' } },
        { textOriginal: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (sentiment) {
      searchCriteria['sentiment.label'] = sentiment;
    }
    
    if (memberStatus) {
      searchCriteria.memberStatus = memberStatus;
    }

    const comments = await Comment.find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(comments);
  } catch (error) {
    logger.error('Error searching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router; 