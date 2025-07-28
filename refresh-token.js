const youtubeService = require('./src/services/youtubeService');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'token.json');

function isTokenExpired(expiryDate) {
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  return now >= (expiryDate - bufferTime);
}

function formatExpiryDate(expiryDate) {
  const date = new Date(expiryDate);
  const now = Date.now();
  const timeLeft = expiryDate - now;
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    formatted: date.toLocaleString(),
    timeLeft: timeLeft > 0 ? `${hours}h ${minutes}m` : 'EXPIRED',
    isExpired: timeLeft <= 0
  };
}

async function refreshYouTubeToken() {
  try {
    console.log('🔄 Starting YouTube access token refresh...');
    
    // Check current token status using the service method
    const status = youtubeService.getTokenStatus();
    console.log('📋 Current Token Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!status.exists) {
      console.log('❌ Token file not found. Please run authorization first.');
      return;
    }
    
    console.log(`Status: ${status.status.toUpperCase()}`);
    console.log(`Message: ${status.message}`);
    
    if (status.hasExpiry) {
      console.log(`Expiry Date: ${status.expiryDate}`);
      console.log(`Time Left: ${status.timeLeftFormatted}`);
    }
    
    // Use proactive refresh instead of manual refresh
    console.log('\n🔄 Ensuring token is valid (proactive refresh)...');
    await youtubeService.ensureValidToken();
    
    // Get the result after refresh
    const result = await youtubeService.refreshAccessToken();
    
    if (result.success) {
      console.log('✅ Access token refreshed successfully!');
      
      // Get updated token info
      const updatedToken = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      const newExpiryInfo = formatExpiryDate(updatedToken.expiry_date);
      
      console.log('📅 New expiry date:', newExpiryInfo.formatted);
      console.log('⏰ Valid for:', newExpiryInfo.timeLeft);
      console.log('🔑 New access token:', result.access_token.substring(0, 20) + '...');
      console.log('💾 Token saved to token.json');
      
      // Additional expiry information
      const expiryDate = new Date(updatedToken.expiry_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry > 0) {
        console.log(`📊 Token will be valid for approximately ${daysUntilExpiry} day(s)`);
      }
      
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