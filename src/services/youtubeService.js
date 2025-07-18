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
      // console.log(publicVideos);
      return publicVideos;

    } catch (error) {
      logger.error('Error getting weekly videos:', error);
      throw error;
    }
  }
  
  async getLastPublishedDateVideos(channelId, maxResults = 50) {
    await this.initialize();
  
    try {
      // Step 1: Get uploads playlist ID
      const channelRes = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: channelId
      });
  
      const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;
  
      // Step 2: Fetch latest videos from that playlist
      const videoRes = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults
      });
  
      const items = videoRes.data.items;
  
      if (items.length === 0) return [];
  
      // Step 3: Find the most recent publish date (YYYY-MM-DD)
      const publishDates = items.map(item =>
        new Date(item.snippet.publishedAt).toISOString().split('T')[0]
      );
      const latestDate = publishDates.sort().reverse()[0];
  
      // Step 4: Filter videos published on the latest date
      const latestVideos = items.filter(item =>
        item.snippet.publishedAt.startsWith(latestDate)
      );
  
      const videoIds = latestVideos.map(item => item.contentDetails.videoId);
      // const videoIds = items.map(item => item.contentDetails.videoId);
  
      // Step 5: Fetch full video details (to check public status)
      const videoDetailsRes = await this.youtube.videos.list({
        part: ['status', 'snippet'],
        id: videoIds.join(',')
      });
  
      const publicVideos = videoDetailsRes.data.items.filter(video =>
        video.status.privacyStatus === 'public' &&
        video.snippet.liveBroadcastContent !== 'upcoming'
      );
  
      return publicVideos;
  
    } catch (error) {
      logger.error('Error getting videos from last publish date:', error);
      throw error;
    }
  }

  async getRecentVideos(channelId, maxResults = 50) {
    await this.initialize();
  
    try {
      const channelRes = await this.youtube.channels.list({
        part: ['contentDetails'],
        id: channelId
      });
  
      const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;

      const videoRes = await this.youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults
      });
  
      const items = videoRes.data.items;
  
      if (items.length === 0) return [];
  
      const videoIds = items.map(item => item.contentDetails.videoId);

      const videoDetailsRes = await this.youtube.videos.list({
        part: ['status', 'snippet'],
        id: videoIds.join(',')
      });
  
      const publicVideos = videoDetailsRes.data.items
        .filter(video =>
          video.status.privacyStatus === 'public' &&
          video.snippet.liveBroadcastContent !== 'upcoming'
        )
        .sort((a, b) =>
          new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)
        ); // sort by most recent
  
      return publicVideos;
  
    } catch (error) {
      logger.error('Error getting videos from last publish date:', error);
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

  async checkIfVideoHasNoComments(videoId) {
    await this.initialize(); // Make sure your YouTube client is ready
  
    try {
      const res = await this.youtube.commentThreads.list({
        part: ['id'],
        videoId: videoId,
        maxResults: 1, // We just need to know if at least 1 comment exists
        order: 'time'
      });
  
      if (res.data.items.length === 0) {
        console.log(`❌ No comments found for video: ${videoId}`);
        return true; // No comments
      }
  
      console.log(`✅ Comments found for video: ${videoId}`);
      return false; // Comments exist
    } catch (error) {
      if (error.errors && error.errors[0].reason === 'commentsDisabled') {
        console.log(`⚠️ Comments are disabled for video: ${videoId}`);
        return false;
      }
  
      console.error('❌ Error checking comments:', error.message);
      throw error;
    }
  }

  async addTopLevelComment(videoId, text) {
    await this.initialize();
    const response = await this.youtube.commentThreads.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          videoId: videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text
            }
          }
        }
      }
    });
  
    console.log(`✅ Comment added to video ${videoId}`);
    console.log(`🗨️ Comment ID: ${response.data.id}`);
    return response.data;
  }

  async downloadCaptions(videoId, format = 'srt') {
    await this.initialize();
  
    try {
      // Step 1: List caption tracks
      const captionListRes = await this.youtube.captions.list({
        part: ['id', 'snippet'],
        videoId: videoId
      });
  
      const tracks = captionListRes.data.items;
      if (tracks.length === 0) {
        console.log('❌ No caption tracks found.');
        return;
      }
  
      // Step 2: Pick first caption track (adjust if needed)
      const captionId = tracks[0].id;
      const language = tracks[0].snippet.language;
      console.log(`✅ Found captions in: ${language}`);
  
      // Step 3: Download caption file
      const res = await this.youtube.captions.download(
        { id: captionId, tfmt: format },
        { responseType: 'stream' }
      );
  
      const outPath = path.join(__dirname, `captions-${videoId}.${format}`);
      const dest = fs.createWriteStream(outPath);
  
      await new Promise((resolve, reject) => {
        res.data
          .pipe(dest)
          .on('finish', () => {
            console.log(`✅ Captions saved to: ${outPath}`);
            resolve();
          })
          .on('error', reject);
      });
    } catch (err) {
      console.error('❌ Error fetching captions:', err.message);
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

  async updateVideoDescription(videoId, newDescription) {
    await this.initialize(); // Ensure OAuth and YouTube client are ready
  
    try {
      // Step 1: Get the current video metadata (required before updating)
      const getRes = await this.youtube.videos.list({
        part: ['snippet'],
        id: videoId
      });
  
      if (getRes.data.items.length === 0) {
        throw new Error(`No video found with ID: ${videoId}`);
      }
  
      const video = getRes.data.items[0];
      const snippet = video.snippet;
  
      // Step 2: Update the snippet with the new description
      snippet.description = newDescription;
  
      const updateRes = await this.youtube.videos.update({
        part: ['snippet'],
        requestBody: {
          id: videoId,
          snippet: snippet
        }
      });
  
      console.log(`✅ Description updated for video: ${videoId}`);
      return updateRes.data;
    } catch (error) {
      console.error(`❌ Failed to update video description:`, error);
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

  // Update video thumbnail
  async updateVideoThumbnail(videoId, imageBuffer) {
    await this.initialize();
    try {
      logger.info(`Updating thumbnail for video: ${videoId}`);

      // Use the YouTube API v3 thumbnails.set endpoint
      const response = await this.youtube.thumbnails.set({
        videoId: videoId,
        media: {
          mimeType: 'image/jpeg',
          body: imageBuffer
        }
      });

      logger.info(`Successfully updated thumbnail for video: ${videoId}`);
      return { 
        success: true, 
        data: response.data,
        thumbnailUrl: response.data.items?.[0]?.default?.url
      };
      
    } catch (error) {
      logger.error(`Error updating thumbnail for video ${videoId}:`, error);
      return { 
        success: false, 
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Get video thumbnail URLs
  async getVideoThumbnails(videoId) {
    await this.initialize();
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet'],
        id: [videoId]
      });

      if (response.data.items.length === 0) {
        throw new Error(`No video found with ID: ${videoId}`);
      }

      const thumbnails = response.data.items[0].snippet.thumbnails;
      return { success: true, thumbnails };
      
    } catch (error) {
      logger.error(`Error getting thumbnails for video ${videoId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new YouTubeService(); 