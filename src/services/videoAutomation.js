const youtubeService = require('./youtubeService');
const aiService = require('./aiService');
const Comment = require('../models/Comment');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class VideoAutomation {
  constructor() {
    this.stats = {

    };
  }

  // Main video processing function
  async processVideos() {
    try {
      logger.info('Starting video automation cycle');
      
      // Get videos that are published on the latest date.
      const videos = await youtubeService.getWeeklyVideos(process.env.YOUTUBE_CHANNEL_ID, 20);
      
      console.log(videos);

      if (videos.length === 0) {
        logger.info('No videos found on channel. Skipping video processing.');
        return this.stats;
      }
      
      for (const video of videos) {
        logger.info(`Processing timestamps and description for video: ${video.id.videoId}`);
        await this.processVideoTimestampsAndDescription(video.id.videoId, video.snippet.title);
      }
      
      logger.info(`Video automation completed. Stats: ${JSON.stringify(this.stats)}`);
      return this.stats;
    } catch (error) {
      logger.error('Error in video automation:', error);
      throw error;
    }
  }

  // Process comments for a specific video
  async processVideoTimestampsAndDescription(videoId, videoTitle) {
    try {
      
      // Get transcript for video
      const transcript = await youtubeService.getTranscript(videoId);
      
      logger.info(`Successfully fetched transcript for video ${videoId}`);
      
    } catch (error) {
      logger.error(`Error fetching transcript for video ${videoId}:`, error);
    }
  }

  // Process a single comment
  async processSingleComment(comment, videoId, videoTitle) {
    try {
      // Use findOneAndUpdate to handle race conditions and duplicates
      let commentRecord = await Comment.findOneAndUpdate(
        { commentId: comment.id },
        {
          $setOnInsert: {
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
            processed: false
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      // Skip if already processed (double-check after upsert)
      if (commentRecord.processed) {
        return;
      }

      // Check membership status using CSV data
      const memberInfo = this.getMemberInfo(comment.snippet.authorChannelId?.value || null);
      commentRecord.memberStatus = memberInfo.tier;
      commentRecord.memberLevel = memberInfo.level;
      commentRecord.memberName = memberInfo.name;

      // Analyze comment with AI
      const analysis = await aiService.analyzeComment(comment.snippet.textOriginal);
      logger.debug(`AI analysis for comment ${comment.id}:`, analysis);
      
      // Normalize detectedKeywords categories to lowercase
      if (analysis.detectedKeywords && Array.isArray(analysis.detectedKeywords)) {
        analysis.detectedKeywords = analysis.detectedKeywords.map(keyword => ({
          ...keyword,
          category: keyword.category ? keyword.category.toLowerCase() : 'unknown'
        }));
      }
      
      // Update comment record with analysis
      commentRecord.sentiment = analysis.sentiment;
      commentRecord.detectedKeywords = analysis.detectedKeywords;
      commentRecord.toxicity = {
        score: analysis.sentiment.score,
        flagged: analysis.toxicity,
        reasons: this.getToxicityReasons(analysis)
      };

      // Process automation actions
      await this.processAutomationActions(videoId, videoTitle, commentRecord, analysis);

      // Mark as processed
      commentRecord.processed = true;
      await commentRecord.save();

      this.stats.processed++;
      
    } catch (error) {
      logger.error(`Error processing comment ${comment.id}:`, error);
      this.stats.errors++;
    }
  }
}

module.exports = new VideoAutomation(); 