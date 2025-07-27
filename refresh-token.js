const youtubeService = require('./src/services/youtubeService');
const logger = require('./src/utils/logger');

async function refreshYouTubeToken() {
  try {
    console.log('🔄 Starting YouTube access token refresh...');
    
    const result = await youtubeService.refreshAccessToken();
    
    if (result.success) {
      console.log('✅ Access token refreshed successfully!');
      console.log('📅 New expiry date:', new Date(result.expiry_date).toLocaleString());
      console.log('🔑 New access token:', result.access_token.substring(0, 20) + '...');
      console.log('💾 Token saved to token.json');
    } else {
      console.log('❌ Failed to refresh access token');
    }
    
  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    logger.error('Token refresh failed:', error);
  }
}

// Run the refresh function
refreshYouTubeToken(); 