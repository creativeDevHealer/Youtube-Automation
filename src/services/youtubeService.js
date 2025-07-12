const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const axios = require('axios');

const CLIENT_SECRET_PATH = path.join(__dirname, '../../client_secret.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

class YouTubeService {
  constructor() {
    this.youtube = null;
    this.oAuth2Client = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      // Load client secrets
      const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
      
      // Handle different client secret file structures
      let client_secret, client_id, redirect_uris;
      
      if (credentials.installed) {
        // Desktop app structure
        ({ client_secret, client_id, redirect_uris } = credentials.installed);
      } else if (credentials.web) {
        // Web app structure
        ({ client_secret, client_id, redirect_uris } = credentials.web);
      } else {
        // Direct structure
        ({ client_secret, client_id, redirect_uris } = credentials);
      }
      
      this.oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris ? redirect_uris[0] : 'http://localhost'
      );
      // Load token
      if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        this.oAuth2Client.setCredentials(token);
      } else {
        logger.error('OAuth2 token.json not found. Please run the authorization script to generate it.');
        throw new Error('OAuth2 token.json not found.');
      }
      this.youtube = google.youtube({ version: 'v3', auth: this.oAuth2Client });
      this.initialized = true;
      logger.info('YouTube API initialized successfully with OAuth2');
    } catch (error) {
      logger.error('Failed to initialize YouTube API with OAuth2:', error);
      throw error;
    }
  }

  // Get channel information
  async getChannelInfo(channelId) {
    await this.initialize();
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings'],
        id: [channelId]
      });

      return response.data.items[0];
    } catch (error) {
      logger.error('Error getting channel info:', error);
      throw error;
    }
  }

  // Get video information
  async getVideoInfo(videoId) {
    await this.initialize();
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics'],
        id: [videoId]
      });

      return response.data.items[0];
    } catch (error) {
      logger.error('Error getting video info:', error);
      throw error;
    }
  }

  // Get recent videos
  async getRecentVideos(channelId, maxResults = 50) {
    await this.initialize();
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: maxResults
      });
  
      const items = response.data.items;
      if (!items.length) return [];
  
      // Extract latest upload date (YYYY-MM-DD)
      const latestDate = new Date(items[0].snippet.publishedAt).toISOString().split('T')[0];
  
      // Filter videos uploaded on that same date
      const filteredVideos = items.filter(item => {
        const itemDate = new Date(item.snippet.publishedAt).toISOString().split('T')[0];
        return itemDate === latestDate;
      });
  
      return filteredVideos;
    } catch (error) {
      logger.error('Error getting recent videos:', error);
      throw error;
    }
  }

  async getWeekVideos(channelId, maxResults = 50) {
    await this.initialize();
    try {
      // Step 1: Get uploads playlist ID
      const channelRes = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: channelId
      });
  
      const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
  
      // Step 2: Get videos from that playlist
      const videoRes = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: maxResults
      });
  
      const items = videoRes.data.items;
  
      // Step 3: Filter videos published in the current week
      const now = new Date();
      const dayOfWeek = now.getDay(); // Sunday = 0
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
  
      const thisWeekVideos = items.filter(item => {
        const publishedAt = new Date(item.contentDetails.videoPublishedAt);
        return publishedAt >= startOfWeek && publishedAt <= now;
      });
  
      if (thisWeekVideos.length === 0) return [];
  
      // Step 4: Get only public videos using videos.list
      const videoIds = thisWeekVideos.map(item => item.contentDetails.videoId);
  
      const videoDetailsRes = await this.youtube.videos.list({
        part: ['status', 'snippet'],
        id: videoIds.join(',')
      });
  
      const publicVideos = videoDetailsRes.data.items.filter(video => {
        return (
          video.status.privacyStatus === 'public' &&
          video.snippet.liveBroadcastContent !== 'upcoming'
        );
      });
      console.log(publicVideos);
      return publicVideos;

    } catch (error) {
      logger.error('Error getting weekly videos:', error);
      throw error;
    }
  }
  

  // Get video comments
  async getVideoComments(videoId, maxResults = 100) {
    await this.initialize();
    try {
      const response = await this.youtube.commentThreads.list({
        part: ['snippet', 'replies'],
        videoId: videoId,
        maxResults: maxResults,
        order: 'time',
        textFormat: 'plainText',
        moderationStatus: 'published'
      });
      return response.data.items;
    } catch (error) {
      logger.error('Error getting video comments:', error);
      throw error;
    }
  }

  // Get all comments for a video (handles pagination)
  async getAllVideoComments(videoId) {
    await this.initialize();
    try {
      let allComments = [];
      let nextPageToken = null;

      do {
        const response = await this.youtube.commentThreads.list({
          part: ['snippet', 'replies'],
          videoId: videoId,
          maxResults: 100,
          order: 'time',
          pageToken: nextPageToken
        });

        allComments = allComments.concat(response.data.items);
        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      return allComments;
    } catch (error) {
      logger.error('Error getting all video comments:', error);
      throw error;
    }
  }

  // Like a comment
  async likeComment(commentId) {
    await this.initialize();
    try {
      // Note: YouTube API doesn't directly support liking comments
      // This would need to be done through YouTube Studio or browser automation
      logger.warn(`YouTube API doesn't support liking comments directly. Comment ID: ${commentId}`);
      return { success: false, reason: 'API limitation - liking not supported' };
    } catch (error) {
      logger.error('Error in likeComment:', error);
      throw error;
    }
  }

  async replyToComment(videoId, commentId, replyText) {
    await this.initialize();
    try {
      const token = this.oAuth2Client.credentials.access_token;
  
      const response = await fetch('https://www.googleapis.com/youtube/v3/comments?part=id,snippet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snippet: {
            parentId: commentId,
            textOriginal: replyText
          }
        })
      });
  
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(`Failed to reply: ${data.error?.message || 'Unknown error'}`);
      }
  
      logger.info(`Successfully replied to comment: ${commentId}`);
      return data;
    } catch (error) {
      logger.error(`Error replying to comment ${commentId}:`, error);
      throw error;
    }
  }

  async deleteComment(commentId) {
    await this.initialize();
    try {
      const token = this.oAuth2Client.credentials.access_token;
      console.log(token);
      const response = await fetch(`https://www.googleapis.com/youtube/v3/comments?id=${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(`Failed to delete comment: ${data.error?.message || 'Unknown error'}`);
      }
  
      logger.info(`Successfully deleted comment: ${commentId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting comment ${commentId}:`, error);
      throw error;
    }
  }

  async rejectComment(videoId, videoTitle, commentId) {
    await this.initialize();
    try {
      const token = this.oAuth2Client.credentials.access_token;
      const url = `https://www.googleapis.com/youtube/v3/comments/setModerationStatus?id=${commentId}&moderationStatus=rejected`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
        // No body needed!
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(`Failed to reject: ${data.error?.message || 'Unknown error'}`);
      }

      logger.info(`Successfully rejected comment: ${commentId} of ${videoTitle} : ${videoId}`);
      return true;
    } catch (error) {
      logger.error(`Error rejecting comment ${commentId}:`, error);
      throw error;
    }
  }

  async getTranscript(videoId) {
    const transcriptUrl = this.buildTranscriptUrl(videoId);
    try {
      const response = await axios.get(transcriptUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
  
      console.log('✅ Transcript fetched successfully');
      return response.data; // Return transcript data for further processing
    } catch (err) {
      console.log('❌ Failed to fetch transcript:', err.message);
      return null; // Return null in case of error
    }
  }
  
  buildTranscriptUrl(videoId) {
    const baseUrl = 'https://youtubenavigator.com/api/fetch-transcript?url=https://www.youtube.com/watch?v=';
    const timestampsParam = '&timestamps=true';
    return `${baseUrl}${videoId}${timestampsParam}`;
  }
}

module.exports = new YouTubeService(); 