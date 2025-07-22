const youtubeService = require('./youtubeService');
const aiService = require('./aiService');
const Comment = require('../models/Comment');
const CommentAction = require('../models/CommentAction');
const Member = require('../models/Member');
const logger = require('../utils/logger');
const keywords = require('../config/keywords');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class CommentAutomation {
  constructor() {
    this.stats = {
      processed: 0,
      liked: 0,
      replied: 0,
      deleted: 0,
      alerted: 0,
      errors: 0
    };
    this.emailTransporter = this.initializeEmail();
    this.membersList = null; // Cache for members data
  }

  // Initialize email transporter
  initializeEmail() {
    // Only initialize if email configuration is provided
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('Email configuration not provided. Email features will be disabled.');
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Extract channel ID from YouTube URL
  extractChannelId(url) {
    if (!url) return null;
    const match = url.match(/channel\/(UC[a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  // Load members from CSV file
  async loadMembersFromCSV() {
    try {
      const csvPath = path.join(process.cwd(), 'members of channel.csv');
      const csvContent = await fs.readFile(csvPath, 'utf8');
      const lines = csvContent.split('\n');
      
      const members = {};
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        if (values.length >= 3) {
          const memberName = values[0];
          const profileLink = values[1];
          const currentLevel = values[2];
          
          // Extract channel ID from profile URL
          const channelId = this.extractChannelId(profileLink);
          
          if (channelId) {
            members[channelId] = {
              name: memberName,
              level: currentLevel,
              profileLink: profileLink
            };
          }
        }
      }
      
      this.membersList = members;
      // logger.info(`Loaded ${Object.keys(members).length} members from CSV`);
    } catch (error) {
      // logger.error('Error loading members CSV:', error);
      this.membersList = {};
    }
  }

  // Convert membership level to tier
  convertLevelToTier(level) {
    if (level.includes('You＇re Good!')) {
      return 'tier1';
    } else if (level.includes('You＇re Really Good!')) {
      return 'tier2'; 
    } else if (level.includes('Really Good ＆ Legendary!')) {
      return 'tier3';
    }
    return 'none'; // Return none if no match (for non-members)
  }

  // Get member info for a commenter
  getMemberInfo(authorChannelId) {
    if (!this.membersList || !authorChannelId) {
      return {
        level: 'none',
        tier: 'none',
        name: null,
        profileLink: null
      };
    }
    
    if (this.membersList[authorChannelId]) {
      const memberData = this.membersList[authorChannelId];
      const convertedTier = this.convertLevelToTier(memberData.level);
      return {
        ...memberData,
        level: convertedTier,  // Use converted enum value for level too
        tier: convertedTier
      };
    }
    
    return {
      level: 'none',
      tier: 'none',
      name: null,
      profileLink: null
    };
  }

  // Main comment processing function
  async processComments() {
    try {
      // logger.info('Starting comment automation cycle');
      
      // Get videos that are published on the latest date.
      // const videos = await youtubeService.getLastPublishedDateVideos(process.env.YOUTUBE_CHANNEL_ID, 5);
      const videos = await youtubeService.getRecentVideos(process.env.YOUTUBE_CHANNEL_ID, 50)
      
      // console.log(videos);

      if (videos.length === 0) {
        // logger.info('No videos found on channel. Skipping comment processing.');
        return this.stats;
      }
      
      for (const video of videos) {
        // logger.info(`Processing comments for video: ${video.id}`);
        await this.processVideoComments(video.id, video.snippet.title);
      }
      
      logger.info(`Comment automation completed. Stats: ${JSON.stringify(this.stats)}`);
      return this.stats;
    } catch (error) {
      // logger.error('Error in comment automation:', error);
      throw error;
    }
  }

  // Process comments for a specific video
  async processVideoComments(videoId, videoTitle) {
    try {
      // Load members data if not already loaded
      if (!this.membersList) {
        await this.loadMembersFromCSV();
      }
      
      // Get all comments for the video
      const comments = await youtubeService.getAllVideoComments(videoId);
      
      // Extract comment text and ID from each comment
      for (const commentThread of comments) {
        const comment = commentThread.snippet.topLevelComment;
        // Process each comment through the automation system
        await this.processSingleComment(comment, videoId, videoTitle);

      }
      
    } catch (error) {
      // logger.error(`Error processing comments for video ${videoId}:`, error);
      this.stats.errors++;
    }
  }

  // Process a single comment
  async processSingleComment(comment, videoId, videoTitle) {
    try {
      // Use findOneAndUpdate to handle race conditions and duplicates
      let commentRecord = await Comment.findOne({ commentId: comment.id });

      if (!commentRecord) {
        commentRecord = await Comment.create({
          commentId: comment.id,
          videoId: videoId,
          authorChannelId: comment.snippet.authorChannelId?.value || null,
          authorDisplayName: comment.snippet.authorDisplayName,
          authorProfileImageUrl: comment.snippet.authorProfileImageUrl,
          textDisplay: comment.snippet.textDisplay,
          textOriginal: comment.snippet.textOriginal,
          likeCount: comment.snippet.likeCount,
          publishedAt: comment.snippet.publishedAt,
          updatedAt: comment.snippet.updatedAt,
          processed: true
        });
      } else {
        return; // Already processed, skip
      }

      // Check membership status using CSV data
      const memberInfo = this.getMemberInfo(comment.snippet.authorChannelId?.value || null);
      commentRecord.memberStatus = memberInfo.tier;
      commentRecord.memberLevel = memberInfo.level;
      commentRecord.memberName = memberInfo.name;

      // Analyze comment with AI
      const analysis = await aiService.analyzeComment(comment.snippet.textOriginal);
      // logger.debug(`AI analysis for comment ${comment.id}:`, analysis);
      
      // Normalize detectedKeywords categories to lowercase
      if (analysis.detectedKeywords && Array.isArray(analysis.detectedKeywords)) {
        analysis.detectedKeywords = analysis.detectedKeywords.map(keyword => ({
          ...keyword,
          category: keyword.category ? keyword.category.toLowerCase() : 'unknown'
        }));
      }
      
      // Update comment record with analysis
      // commentRecord.sentiment = analysis.sentiment;
      // commentRecord.detectedKeywords = analysis.detectedKeywords;
      // commentRecord.toxicity = {
      //   score: analysis.sentiment.score,
      //   flagged: analysis.toxicity,
      //   reasons: this.getToxicityReasons(analysis)
      // };

      // Process automation actions
      await this.processAutomationActions(videoId, videoTitle, commentRecord, analysis);

      // // Mark as processed
      // commentRecord.processed = true;
      // await commentRecord.save();

      this.stats.processed++;
      
    } catch (error) {
      // logger.error(`Error processing comment ${comment.id}:`, error);
      this.stats.errors++;
    }
  }

  // Check for negative keywords that prevent liking
  hasNegativeKeywords(text) {
    const lowerText = text.toLowerCase();
    return keywords.negative.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  // Check for troll/spam keywords that trigger deletion
  hasTrollKeywords(text) {
    const lowerText = text.toLowerCase();
    return keywords.troll.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  // Check for milestone keywords and return appropriate response
  getMilestoneResponse(text) {
    const lowerText = text.toLowerCase();
    
    // Check milestones
    for (const [keyword, response] of Object.entries(keywords.milestones)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return response;
      }
    }
    
    // Check praise
    for (const [keyword, response] of Object.entries(keywords.praise)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return response;
      }
    }
    
    // Check special keywords
    for (const [keyword, response] of Object.entries(keywords.special)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return response;
      }
    }
    
    // Check website access issues
    for (const [keyword, response] of Object.entries(keywords.websiteAccess)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return response;
      }
    }
    
    return null;
  }

  // Check if comment praises Jimmy or loves horoscope
  isPraiseComment(text) {
    const lowerText = text.toLowerCase();
    const praiseIndicators = [
      'jimmy', 'love the horoscope', 'love your horoscope', 'love the forecast', 
      'love your forecast', 'amazing reading', 'perfect reading', 'spot on',
      'accurate', 'thank you jimmy'
    ];
    
    return praiseIndicators.some(phrase => lowerText.includes(phrase)) &&
           keywords.positive.some(keyword => lowerText.includes(keyword));
  }

  // Process automation actions based on analysis
  async processAutomationActions(videoId, videoTitle, commentRecord, analysis) {
    const actions = [];
    const commentText = commentRecord.textDisplay || commentRecord.textOriginal;

    try {
      // 1. DELETION LOGIC - Delete troll/spam/negative comments
      const hasTrollContent = this.hasTrollKeywords(commentText) || analysis.toxicity;
      
      if (hasTrollContent) {
        try {
          // Be more lenient with higher tier members
                const shouldDelete = commentRecord.memberStatus === 'none' ||
        (commentRecord.memberStatus === 'tier1' && analysis.sentiment?.confidence > 0.9) ||
        (commentRecord.memberStatus === 'tier2' && analysis.sentiment?.confidence > 0.95) ||
        (commentRecord.memberStatus === 'tier3' && analysis.sentiment?.confidence > 0.98);
          
          if (shouldDelete && commentRecord.commentId && commentRecord.videoId) {
            await this.deleteComment(videoId, videoTitle, commentRecord.commentId, `Troll/toxic content from ${commentRecord.memberStatus}`);
            actions.push({ action: 'deleted', reason: `Troll/toxic content from ${commentRecord.memberStatus}` });
            this.stats.deleted++;
            return; // Exit early if deleted
          } else if (!shouldDelete) {
            // logger.warn(`Flagging troll comment from ${commentRecord.memberStatus} member for manual review: ${commentRecord.commentId}`);
            actions.push({ action: 'flagged_only', reason: `Troll content from ${commentRecord.memberStatus} - manual review needed` });
          }
        } catch (error) {
          // logger.warn(`Failed to delete comment ${commentRecord.commentId}: ${error.message}`);
          actions.push({ action: 'delete_failed', reason: error.message });
        }
      }

      // 2. LIKE/HEART LOGIC
      const hasNegativeKeywords = this.hasNegativeKeywords(commentText);
      
      if (!hasNegativeKeywords && !hasTrollContent) {
        let shouldLike = false;
        let likeReason = '';

        // Heart/like all comments from paid members (tier1-3) unless negative tone
        if (['tier1', 'tier2', 'tier3'].includes(commentRecord.memberStatus)) {
          if (analysis.sentiment?.label !== 'negative') {
            shouldLike = true;
            likeReason = `${commentRecord.memberStatus} member comment`;
          }
        }
        // Minimally heart/like positive subscriber comments that praise Jimmy or love horoscope
        else if (commentRecord.memberStatus === 'none') {
          if (analysis.sentiment?.label === 'positive' && this.isPraiseComment(commentText)) {
            shouldLike = true;
            likeReason = 'Positive subscriber comment praising Jimmy/horoscope';
          }
        }

        if (shouldLike) {
          // try {
          //   const result = await this.likeComment(commentRecord.commentId);
          //   if (result.success) {
          //     actions.push({ action: 'liked', reason: likeReason });
          //     this.stats.liked++;
          //   } else {
          //     actions.push({ action: 'like_skipped', reason: result.reason });
          //     logger.info(`Skipped liking comment ${commentRecord.commentId}: ${result.reason}`);
          //   }
          // } catch (error) {
          //   logger.warn(`Failed to like comment ${commentRecord.commentId}: ${error.message}`);
          //   actions.push({ action: 'like_failed', reason: error.message });
          // }
        }
      }

      // 3. AUTO-REPLY LOGIC
      const milestoneResponse = this.getMilestoneResponse(commentText);
      
      if (milestoneResponse && !hasNegativeKeywords && !hasTrollContent) {
        try {
          let replyText = milestoneResponse;
          
          // Prioritize members with personalized responses
          if (['tier2', 'tier3'].includes(commentRecord.memberStatus)) {
            // const memberName = commentRecord.memberName || commentRecord.authorDisplayName;
            if (milestoneResponse.includes('Congrats!')) {
              replyText = `${milestoneResponse}`;
            } else if (milestoneResponse.includes('Thank you')) {
              replyText = `${milestoneResponse}`;
            } else {
              replyText = `${milestoneResponse}`;
            }
          }
          
          await this.replyToComment(commentRecord.videoId, videoTitle, commentRecord.commentId, replyText);
          actions.push({ 
            action: 'replied', 
            reason: `Milestone/praise response for ${commentRecord.memberStatus}`,
            responseText: replyText
          });
          this.stats.replied++;
        } catch (error) {
          // logger.warn(`Failed to reply to comment ${commentRecord.commentId}: ${error.message}`);
          actions.push({ action: 'reply_failed', reason: error.message });
        }
      }

      // 4. ALERT LOGIC
      if (this.shouldTriggerAlert(analysis.detectedKeywords) || this.hasAlertKeywords(commentText)) {
        await this.triggerAlert(commentRecord, analysis.detectedKeywords);
        actions.push({ action: 'alerted', reason: 'Alert keyword detected' });
        this.stats.alerted++;
      }

      // 5. SUPERFAN TRACKING
      await this.updateSuperfanScore(commentRecord, analysis);

      // Update comment record with actions
      commentRecord.automationActions = actions;
      
    } catch (error) {
      // logger.error('Error processing automation actions:', error);
      actions.push({ action: 'error', reason: error.message });
    }
  }

  // Check for alert keywords
  hasAlertKeywords(text) {
    const lowerText = text.toLowerCase();
    return keywords.alerts.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  // Check for website access keywords
  hasWebsiteAccessKeywords(text) {
    const lowerText = text.toLowerCase();
    return Object.keys(keywords.websiteAccess).some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  // Log comment action to CommentAction model
  async logCommentAction(actionData) {
    try {
      // Get comment details if commentId is provided
      let commentRecord = null;
      if (actionData.commentId) {
        commentRecord = await Comment.findOne({ commentId: actionData.commentId });
      }

      const commentActionData = {
        videoId: actionData.videoId,
        videoTitle: actionData.videoTitle,
        commentId: actionData.commentId,
        commentText: actionData.commentText || (commentRecord ? commentRecord.textDisplay : 'N/A'),
        repliedComment: actionData.repliedComment || null,
        processedAt: actionData.processedAt || new Date(),
        actionType: actionData.actionType,
        authorDisplayName: actionData.authorDisplayName || (commentRecord ? commentRecord.authorDisplayName : null),
        authorChannelId: actionData.authorChannelId || (commentRecord ? commentRecord.authorChannelId : null),
        memberStatus: actionData.memberStatus || (commentRecord ? commentRecord.memberStatus : 'none'),
        reason: actionData.reason || null
      };

      const commentAction = new CommentAction(commentActionData);
      await commentAction.save();
      
      // logger.info(`Logged ${actionData.actionType} action for comment ${actionData.commentId}`);
    } catch (error) {
      // Don't throw here as we don't want logging failures to break the main action
      // logger.error('Error logging comment action:', error);
    }
  }

  // Delete a comment
  async deleteComment(videoId, videoTitle, commentId, reason) {
    try {
      // await youtubeService.rejectComment(videoId, videoTitle, commentId);
      
      // Log the action to CommentAction model
      await this.logCommentAction({
        videoId,
        videoTitle,
        commentId,
        actionType: 'deleted',
        reason,
      });
      
      // logger.info(`Deleted comment ${commentId}: ${reason} VideoTitle: ${videoTitle} : ${videoId}` );
    } catch (error) {
      // logger.error(`Error deleting comment ${commentId}:`, error);
      throw error;
    }
  }

  // Like a comment
  async likeComment(commentId) {
    try {
      const result = await youtubeService.likeComment(commentId);
      if (result.success === false) {
        // logger.warn(`Cannot like comment ${commentId}: ${result.reason}`);
        return { success: false, reason: result.reason };
      }
      // logger.info(`Liked comment ${commentId}`);
      return { success: true };
    } catch (error) {
      // logger.error(`Error liking comment ${commentId}:`, error);
      throw error;
    }
  }

  // Reply to a comment
  async replyToComment(videoId, videoTitle, commentId, replyText) {
    try {
      // await youtubeService.replyToComment(videoId, commentId, replyText);
      
      // Log the action to CommentAction model
      await this.logCommentAction({
        videoId,
        videoTitle,
        commentId,
        actionType: 'replied',
        repliedComment: replyText
      });
      
      // logger.info(`Replied to comment ${commentId}: ${replyText} VideoTitle: ${videoTitle}, ${videoId}`);
    } catch (error) {
      // logger.error(`Error replying to comment ${commentId}:`, error);
      throw error;
    }
  }

  // Check if alert should be triggered
  shouldTriggerAlert(detectedKeywords) {
    return detectedKeywords.some(keyword => 
      keyword.category === 'alert' || keywords.alerts.includes(keyword.keyword.toLowerCase())
    );
  }

  // Trigger alert for important keywords
  async triggerAlert(commentRecord, detectedKeywords) {
    try {
      const alertKeywords = detectedKeywords.filter(keyword => 
        keyword.category === 'alert' || keywords.alerts.includes(keyword.keyword.toLowerCase())
      );

      // Send email alert
      // await this.sendAlertEmail(commentRecord, alertKeywords);
      // logger.info(`Alert triggered for comment ${commentRecord.commentId}: ${JSON.stringify(alertKeywords)}`);
      
    } catch (error) {
      // logger.error('Error triggering alert:', error);
    }
  }

  // Send alert email
  async sendAlertEmail(commentRecord, alertKeywords) {
    try {
      if (!this.emailTransporter) {
        // logger.info('Email not configured. Skipping alert email.');
        return;
      }

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: 'YouTube Comment Alert - Important Keywords Detected',
        html: `
          <h2>Comment Alert</h2>
          <p><strong>Author:</strong> ${commentRecord.authorDisplayName}</p>
          <p><strong>Comment:</strong> ${commentRecord.textDisplay}</p>
          <p><strong>Keywords:</strong> ${alertKeywords.map(k => k.keyword).join(', ')}</p>
          <p><strong>Video ID:</strong> ${commentRecord.videoId}</p>
          <p><strong>Member Status:</strong> ${commentRecord.memberStatus}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      // logger.info('Alert email sent successfully');
    } catch (error) {
      // logger.error('Error sending alert email:', error);
    }
  }

  // Get toxicity reasons
  getToxicityReasons(analysis) {
    const reasons = [];
    
    if (analysis.sentiment.label === 'negative' && analysis.sentiment.confidence > 0.7) {
      reasons.push('High negative sentiment');
    }
    
    const negativeKeywords = analysis.detectedKeywords.filter(k => 
      k.category === 'negative' || keywords.negative.includes(k.keyword.toLowerCase())
    );
    
    if (negativeKeywords.length > 0) {
      reasons.push(`Negative keywords: ${negativeKeywords.map(k => k.keyword).join(', ')}`);
    }
    
    const trollKeywords = analysis.detectedKeywords.filter(k => 
      k.category === 'troll' || keywords.troll.includes(k.keyword.toLowerCase())
    );
    
    if (trollKeywords.length > 0) {
      reasons.push(`Troll keywords: ${trollKeywords.map(k => k.keyword).join(', ')}`);
    }
    
    return reasons;
  }

  // Update superfan score based on engagement and membership
  async updateSuperfanScore(commentRecord, analysis) {
    try {
      let member = await Member.findOne({ channelId: commentRecord.authorChannelId });
      
      if (!member) {
        // Ensure we have a valid displayName
        const displayName = commentRecord.authorDisplayName?.trim() || 
                           `User_${commentRecord.authorChannelId?.substring(0, 8) || 'Unknown'}`;
        
        member = new Member({
          channelId: commentRecord.authorChannelId,
          displayName: displayName,
          profileImageUrl: commentRecord.authorProfileImageUrl,
          membershipLevel: commentRecord.memberLevel || 'none',
          memberSince: new Date(),
          superfanScore: 0,
          totalComments: 0,
          keywordMentions: {
            milestone: 0,
            praise: 0,
            positive: 0,
            negative: 0,
            websiteAccess: 0
          }
        });
      }

      // Calculate superfan score based on various factors
      let scoreIncrease = 0;
      
      // Base score for membership tier
      if (commentRecord.memberStatus === 'tier3') scoreIncrease += 50;
      else if (commentRecord.memberStatus === 'tier2') scoreIncrease += 30;
      else if (commentRecord.memberStatus === 'tier1') scoreIncrease += 15;
      else scoreIncrease += 5; // Non-members still get some points
      
      // Sentiment bonus
      if (analysis.sentiment?.label === 'positive') {
        scoreIncrease += Math.floor(analysis.sentiment.confidence * 20);
      } else if (analysis.sentiment?.label === 'negative') {
        scoreIncrease -= 10; // Penalty for negative sentiment
      }
      
      // Keyword bonuses
      const commentText = commentRecord.textDisplay || commentRecord.textOriginal;
      if (this.getMilestoneResponse(commentText)) scoreIncrease += 10;
      if (this.isPraiseComment(commentText)) scoreIncrease += 15;
      if (this.hasAlertKeywords(commentText)) scoreIncrease += 20;
      if (this.hasWebsiteAccessKeywords(commentText)) scoreIncrease += 5;
      
      // Engagement bonus (if comment gets hearts/likes)
      scoreIncrease += (commentRecord.likeCount || 0) * 2;
      
      // Update member record
      member.superfanScore = Math.max(0, member.superfanScore + scoreIncrease);
      member.isSuperfan = member.superfanScore >= 100;
      member.totalComments += 1;
      member.lastCommentAt = new Date();
      member.lastInteractionAt = new Date();
      
      // Update keyword mentions
      if (this.getMilestoneResponse(commentText)) member.keywordMentions.milestone += 1;
      if (this.isPraiseComment(commentText)) member.keywordMentions.praise += 1;
      if (analysis.sentiment?.label === 'positive') member.keywordMentions.positive += 1;
      if (analysis.sentiment?.label === 'negative') member.keywordMentions.negative += 1;
      if (this.hasWebsiteAccessKeywords(commentText)) {
        member.keywordMentions.websiteAccess = (member.keywordMentions.websiteAccess || 0) + 1;
      }
      
      await member.save();
      
      // Update comment record
      commentRecord.superfanScore = scoreIncrease;
      commentRecord.isSuperfan = member.isSuperfan;
      
      // logger.info(`Updated superfan score for ${member.displayName}: +${scoreIncrease} (Total: ${member.superfanScore})`);
      
    } catch (error) {
      // logger.error('Error updating superfan score:', error);
    }
  }

  // Generate daily report
  async generateDailyReport() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get daily statistics
      const stats = await this.getDailyStats();
      
      // Generate AI summary
      const summary = await aiService.generateDailyReport(stats);
      
      // Send email report
      await this.sendDailyReport(stats, summary);
      
      logger.info('Daily report generated and sent');
      
    } catch (error) {
      logger.error('Error generating daily report:', error);
    }
  }

  // Get daily statistics with comprehensive sentiment analysis
  async getDailyStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const commentStats = await Comment.aggregate([
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
            neutralSentiment: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] } },
            tier0Comments: { $sum: { $cond: [{ $eq: ['$memberStatus', 'none'] }, 1, 0] } },
            tier1Comments: { $sum: { $cond: [{ $eq: ['$memberStatus', 'tier1'] }, 1, 0] } },
            tier2Comments: { $sum: { $cond: [{ $eq: ['$memberStatus', 'tier2'] }, 1, 0] } },
            tier3Comments: { $sum: { $cond: [{ $eq: ['$memberStatus', 'tier3'] }, 1, 0] } },
            averageSentimentScore: { $avg: '$sentiment.confidence' },
            milestoneComments: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$detectedKeywords', cond: { $eq: ['$$this.category', 'milestone'] } } } }, 0] }, 1, 0] } },
            praiseComments: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$detectedKeywords', cond: { $eq: ['$$this.category', 'praise'] } } } }, 0] }, 1, 0] } }
          }
        }
      ]);

      // Get superfan statistics
      const superfanStats = await Member.aggregate([
        {
          $match: {
            lastCommentAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            activeSuperfans: { $sum: { $cond: ['$isSuperfan', 1, 0] } },
            newSuperfans: { $sum: { $cond: [{ $and: ['$isSuperfan', { $gte: ['$memberSince', today] }] }, 1, 0] } },
            averageSuperfanScore: { $avg: { $cond: ['$isSuperfan', '$superfanScore', null] } },
            topSuperfanScore: { $max: '$superfanScore' }
          }
        }
      ]);

      const baseStats = commentStats[0] || {
        totalComments: 0,
        totalLiked: 0,
        totalReplied: 0,
        totalDeleted: 0,
        totalAlerted: 0,
        positiveSentiment: 0,
        negativeSentiment: 0,
        neutralSentiment: 0,
        tier0Comments: 0,
        tier1Comments: 0,
        tier2Comments: 0,
        tier3Comments: 0,
        averageSentimentScore: 0,
        milestoneComments: 0,
        praiseComments: 0
      };

      const fanStats = superfanStats[0] || {
        activeSuperfans: 0,
        newSuperfans: 0,
        averageSuperfanScore: 0,
        topSuperfanScore: 0
      };

      return { ...baseStats, ...fanStats };
    } catch (error) {
      logger.error('Error getting daily stats:', error);
      return null;
    }
  }

  // Get weekly statistics for comprehensive reporting
  async getWeeklyStats() {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      
      const weeklyStats = await Comment.aggregate([
        {
          $match: {
            createdAt: { $gte: weekAgo }
          }
        },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: "%Y-%m-%d", 
                date: "$createdAt" 
              } 
            },
            dailyComments: { $sum: 1 },
            dailyPositive: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] } },
            dailyNegative: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] } },
            dailyMemberComments: { $sum: { $cond: [{ $ne: ['$memberStatus', 'none'] }, 1, 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ]);

      return weeklyStats;
    } catch (error) {
      logger.error('Error getting weekly stats:', error);
      return [];
    }
  }

  // Send daily report email with comprehensive sentiment analysis
  async sendDailyReport(stats, summary) {
    try {
      if (!this.emailTransporter) {
        logger.info('Email not configured. Skipping daily report email.');
        return;
      }

      const sentimentPercentage = stats.totalComments > 0 
        ? {
            positive: Math.round((stats.positiveSentiment / stats.totalComments) * 100),
            negative: Math.round((stats.negativeSentiment / stats.totalComments) * 100),
            neutral: Math.round((stats.neutralSentiment / stats.totalComments) * 100)
          }
        : { positive: 0, negative: 0, neutral: 0 };

      const memberComments = stats.tier1Comments + stats.tier2Comments + stats.tier3Comments;

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: '📊 Daily YouTube Comment Automation Report',
        html: `
          <h2>📊 Daily Comment Automation Report</h2>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h3>📈 Engagement Statistics</h3>
          <ul>
            <li><strong>Total Comments Processed:</strong> ${stats.totalComments}</li>
            <li><strong>Comments Liked:</strong> ${stats.totalLiked}</li>
            <li><strong>Comments Replied To:</strong> ${stats.totalReplied}</li>
            <li><strong>Comments Deleted:</strong> ${stats.totalDeleted}</li>
            <li><strong>Alerts Triggered:</strong> ${stats.totalAlerted}</li>
          </ul>
          
          <h3>😊 Sentiment Analysis</h3>
          <ul>
            <li><strong>Positive:</strong> ${stats.positiveSentiment} (${sentimentPercentage.positive}%)</li>
            <li><strong>Negative:</strong> ${stats.negativeSentiment} (${sentimentPercentage.negative}%)</li>
            <li><strong>Neutral:</strong> ${stats.neutralSentiment} (${sentimentPercentage.neutral}%)</li>
            <li><strong>Average Sentiment Score:</strong> ${(stats.averageSentimentScore || 0).toFixed(2)}</li>
          </ul>
          
          <h3>💎 Membership Breakdown</h3>
          <ul>
            <li><strong>Tier 3 (Really Good & Legendary!):</strong> ${stats.tier3Comments}</li>
            <li><strong>Tier 2 (You're Really Good!):</strong> ${stats.tier2Comments}</li>
            <li><strong>Tier 1 (You're Good!):</strong> ${stats.tier1Comments}</li>
            <li><strong>Non-Members (Subscribers):</strong> ${stats.tier0Comments}</li>
            <li><strong>Total Member Comments:</strong> ${memberComments}</li>
          </ul>
          
          <h3>🎉 Special Interactions</h3>
          <ul>
            <li><strong>Milestone Comments:</strong> ${stats.milestoneComments}</li>
            <li><strong>Praise Comments:</strong> ${stats.praiseComments}</li>
          </ul>
          
          <h3>⭐ Superfan Activity</h3>
          <ul>
            <li><strong>Active Superfans Today:</strong> ${stats.activeSuperfans}</li>
            <li><strong>New Superfans:</strong> ${stats.newSuperfans}</li>
            <li><strong>Average Superfan Score:</strong> ${(stats.averageSuperfanScore || 0).toFixed(1)}</li>
            <li><strong>Top Superfan Score:</strong> ${stats.topSuperfanScore || 0}</li>
          </ul>
          
          <h3>🤖 AI Summary</h3>
          <p>${summary}</p>
          
          <hr>
          <p><small>Generated by Jimmy's YouTube Comment Automation System</small></p>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Daily report email sent successfully');
    } catch (error) {
      logger.error('Error sending daily report email:', error);
    }
  }

  // Generate and send weekly report
  async generateWeeklyReport() {
    try {
      const weeklyStats = await this.getWeeklyStats();
      const dailyStats = await this.getDailyStats();
      
      // Get top superfans of the week
      const topSuperfans = await Member.find({ 
        lastCommentAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isSuperfan: true 
      })
      .sort({ superfanScore: -1 })
      .limit(10)
      .select('displayName superfanScore membershipTier totalComments');

      await this.sendWeeklyReport(weeklyStats, dailyStats, topSuperfans);
      
      logger.info('Weekly report generated and sent');
      
    } catch (error) {
      logger.error('Error generating weekly report:', error);
    }
  }

  // Send weekly report email
  async sendWeeklyReport(weeklyStats, currentStats, topSuperfans) {
    try {
      if (!this.emailTransporter) {
        logger.info('Email not configured. Skipping weekly report email.');
        return;
      }

      let weeklyChart = '';
      weeklyStats.forEach(day => {
        const positivePercent = day.dailyComments > 0 
          ? Math.round((day.dailyPositive / day.dailyComments) * 100) 
          : 0;
        weeklyChart += `
          <tr>
            <td>${day._id}</td>
            <td>${day.dailyComments}</td>
            <td>${day.dailyPositive}</td>
            <td>${day.dailyNegative}</td>
            <td>${positivePercent}%</td>
            <td>${day.dailyMemberComments}</td>
          </tr>
        `;
      });

      let superfanList = '';
      topSuperfans.forEach((fan, index) => {
        superfanList += `
          <tr>
            <td>${index + 1}</td>
            <td>${fan.displayName}</td>
            <td>${fan.membershipTier}</td>
            <td>${fan.superfanScore}</td>
            <td>${fan.totalComments}</td>
          </tr>
        `;
      });

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: '📊 Weekly YouTube Comment Analytics Report',
        html: `
          <h2>📊 Weekly Comment Analytics Report</h2>
          <p><strong>Week Ending:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h3>📈 Weekly Trends</h3>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f2f2f2;">
              <th>Date</th>
              <th>Comments</th>
              <th>Positive</th>
              <th>Negative</th>
              <th>Positive %</th>
              <th>Member Comments</th>
            </tr>
            ${weeklyChart}
          </table>
          
          <h3>⭐ Top 10 Superfans This Week</h3>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f2f2f2;">
              <th>Rank</th>
              <th>Name</th>
              <th>Tier</th>
              <th>Superfan Score</th>
              <th>Total Comments</th>
            </tr>
            ${superfanList}
          </table>
          
          <h3>💎 Current Week Summary</h3>
          <ul>
            <li><strong>Total Active Superfans:</strong> ${currentStats.activeSuperfans}</li>
            <li><strong>New Superfans This Week:</strong> ${currentStats.newSuperfans}</li>
            <li><strong>Overall Sentiment:</strong> ${currentStats.positiveSentiment > currentStats.negativeSentiment ? '😊 Positive' : currentStats.negativeSentiment > currentStats.positiveSentiment ? '😟 Negative' : '😐 Neutral'}</li>
          </ul>
          
          <hr>
          <p><small>Generated by Jimmy's YouTube Comment Automation System</small></p>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Weekly report email sent successfully');
    } catch (error) {
      logger.error('Error sending weekly report email:', error);
    }
  }
}

module.exports = new CommentAutomation(); 