const youtubeService = require('./src/services/youtubeService');

function checkTokenStatus() {
  try {
    console.log('🔍 Checking YouTube token status...\n');
    
    const status = youtubeService.getTokenStatus();
    
    if (!status.exists) {
      console.log('❌ Token file not found. Please run authorization first.');
      return;
    }
    
    console.log('📋 Token Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Get detailed token info
    const fs = require('fs');
    const path = require('path');
    const TOKEN_PATH = path.join(__dirname, 'token.json');
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    
    // Basic token info
    console.log(`🔑 Access Token: ${token.access_token ? token.access_token.substring(0, 20) + '...' : 'Not found'}`);
    console.log(`🔄 Refresh Token: ${token.refresh_token ? 'Present' : 'Not found'}`);
    console.log(`📝 Token Type: ${token.token_type || 'Unknown'}`);
    console.log(`🎯 Scope: ${token.scope || 'Unknown'}`);
    
    if (token.refresh_token_expires_in) {
      const refreshExpiry = new Date(Date.now() + token.refresh_token_expires_in * 1000);
      console.log(`🔄 Refresh Token Expires: ${refreshExpiry.toLocaleString()}`);
    }
    
    console.log('');
    
    // Expiry information using service method
    console.log('⏰ Expiration Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Status: ${status.status.toUpperCase()}`);
    console.log(`Message: ${status.message}`);
    
    if (status.hasExpiry) {
      console.log(`📅 Expiry Date: ${status.expiryDate}`);
      console.log(`⏱️  Time Remaining: ${status.timeLeftFormatted}`);
      
      // Calculate percentage of token life remaining
      const tokenLifetime = 3600 * 1000; // 1 hour in milliseconds
      const timeUsed = tokenLifetime - status.timeLeftMs;
      const percentageUsed = Math.round((timeUsed / tokenLifetime) * 100);
      
      console.log(`📊 Token Life: ${percentageUsed}% used`);
      
      if (status.status === 'expired') {
        console.log('💡 Recommendation: Run refresh-token.js to get a new token');
      } else if (status.status === 'expiring_soon') {
        console.log('💡 Recommendation: Token will be refreshed automatically soon');
      } else if (percentageUsed > 80) {
        console.log('💡 Recommendation: Consider refreshing token soon');
      } else {
        console.log('💡 Recommendation: Token is still fresh');
      }
    } else {
      console.log('❌ No expiry date found in token');
    }
    
    console.log('');
    console.log('💡 Commands:');
    console.log('   • Run "node refresh-token.js" to refresh the token');
    console.log('   • Run "node proactive-token-refresh.js" to test proactive refresh');
    console.log('   • Run "node check-token-status.js" to check status again');
    
  } catch (error) {
    console.error('❌ Error checking token status:', error.message);
  }
}

// Run the check
checkTokenStatus(); 