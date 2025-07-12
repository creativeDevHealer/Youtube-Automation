const axios = require('axios');

async function getYoutubeTranscript(videoId) {
  const transcriptUrl = buildTranscriptUrl(videoId);
  try {
    const response = await axios.get(transcriptUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('✅ Direct connection works! Status:', response.status);
    console.log('Response sample:', JSON.stringify(response.data, null, 2));
    return response.data; // Return transcript data for further processing
  } catch (err) {
    console.log('❌ Direct connection failed:', err.message);
    return null; // Return null in case of error
  }
}

function buildTranscriptUrl(videoId) {
  const baseUrl = 'https://youtubenavigator.com/api/fetch-transcript?url=https://www.youtube.com/watch?v=';
  const timestampsParam = '&timestamps=true';
  return `${baseUrl}${videoId}${timestampsParam}`;
}


// Call the function and handle the result
getYoutubeTranscript('seEXLy5UB8o').then(data => {
  if (data) {
    console.log("Transcript Data:", data);
  } else {
    console.log("Failed to fetch transcript.");
  }
});
