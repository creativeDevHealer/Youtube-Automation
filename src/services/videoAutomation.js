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
      const videos = await youtubeService.getWeekVideos(process.env.YOUTUBE_CHANNEL_ID, 20);
      
      console.log(videos);

      if (videos.length === 0) {
        logger.info('No videos found on channel. Skipping video processing.');
        return this.stats;
      }
      

      for (const video of videos) {
        logger.info(`Processing timestamps and description for video: ${video.id}`);
        await this.processVideoTimestampsAndDescription(video.id, video.snippet.title);
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
      // Get detailed video information
      const videoInfo = await youtubeService.getVideoInfo(videoId);
      const videoDescription = videoInfo?.snippet?.description || '';
      const videoTags = videoInfo?.snippet?.tags || [];
      const liveBroadcastContent = videoInfo?.snippet?.liveBroadcastContent;
      
      // Detect video type
      const videoType = this.detectVideoType(videoTitle, videoDescription, videoTags, liveBroadcastContent);
      
      logger.info(`Video type detected: ${videoType} for video "${videoTitle}"`);
      
      // Get transcript for video
    //   const transcript = await youtubeService.getTranscript(videoId);
      
    //   logger.info(`Successfully fetched transcript for video ${videoId}`);
      
    } catch (error) {
      logger.error(`Error processing video ${videoId}:`, error);
    }
  }

  // Detect video type based on title, description, tags, and live status
  detectVideoType(title, description, tags, liveBroadcastContent) {
    const titleLower = title.toLowerCase();
    const tagsLower = (tags || []).map(tag => tag.toLowerCase());
    const descriptionLower = description.toLowerCase();
    const zodiacSigns = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];
    const bonusTier3Keywords = [
      'bonus', 'extended reading', 'all 12 signs', 'really good & legendary members'
    ];
    
    for (const keyword of bonusTier3Keywords) {
      if (titleLower.includes(keyword)) {
        return 'bonus_video';
      }
    }
    const hasZodiacPrefix = zodiacSigns.some(sign => titleLower.startsWith(sign));
    if (hasZodiacPrefix) {
      return 'weekly_forecast';
    }
    // Check for livestream
    if (liveBroadcastContent === 'live' || liveBroadcastContent === 'upcoming') {
      return 'livestream';
    }
    if (tagsLower.includes('live') || tagsLower.includes('stream')) {
      return 'livestream';
    }
    const allTags = tagsLower.join(' ');
    if (allTags.includes('live') || allTags.includes('stream')) {
      return 'livestream';
    }
    if(descriptionLower.includes('livestream'))
      return 'livestream';
    return 'regular';
  }
}

module.exports = new VideoAutomation(); 