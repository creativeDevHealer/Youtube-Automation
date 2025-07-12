const youtubeService = require('./src/services/youtubeService');
const logger = require('./src/utils/logger');
require('dotenv').config();

async function testGetRecentVideos2() {
  try {
    console.log('=== Testing getRecentVideos2 function ===');
    console.log('Channel ID:', process.env.YOUTUBE_CHANNEL_ID);
    
    // Test with different maxResults values
    const testCases = [
      { maxResults: 50, description: 'Getting 20 most recent videos' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.description} ---`);
      
      const videos = await youtubeService.getWeekVideos(
        process.env.YOUTUBE_CHANNEL_ID, 
        testCase.maxResults
      );
      
      console.log(`Found ${videos.length} videos:`);
      
      videos.forEach((video, index) => {
        const publishedDate = new Date(video.snippet.publishedAt);
        console.log(`${index + 1}. "${video.snippet.title}"`);
        console.log(`   Published: ${publishedDate.toLocaleDateString()} ${publishedDate.toLocaleTimeString()}`);
        console.log(`   Video ID: ${video.id}`);
        // console.log(`   Status: ${video.status.privacyStatus}`);
        // console.log(`   Description: ${video.snippet.description.substring(0, 100)}...`);
        // console.log('');
      });
      
      // Check for the bonus video specifically
      const bonusVideo = videos.find(video => 
        video.snippet.title.toLowerCase().includes('bonus') ||
        video.snippet.title.toLowerCase().includes('extended reading')
      );
      
      if (bonusVideo) {
        console.log(`✅ Found bonus video: "${bonusVideo.snippet.title}"`);
        console.log(`   Published: ${new Date(bonusVideo.snippet.publishedAt).toLocaleDateString()}`);
      } else {
        console.log('❌ No bonus video found in this batch');
      }
      
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error testing getRecentVideos2:', error);
    logger.error('Error testing getRecentVideos2:', error);
  }
}

// Run the test
testGetRecentVideos2(); 