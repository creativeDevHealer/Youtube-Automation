const youtubeService = require('./youtubeService');
const Video = require('../models/Video');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const parser = require('subtitles-parser');

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
      
      if (videos.length === 0) {
        logger.info('No videos found on channel. Skipping video processing.');
        return this.stats;
      }
      
      // Check which videos already exist in the database
      const videoIds = videos.map(video => video.id);
      const existingVideos = await Video.find({ videoId: { $in: videoIds } });
      const existingVideoIds = existingVideos.map(video => video.videoId);
      
      // Filter out videos that already exist in the database
      const newVideos = videos.filter(video => !existingVideoIds.includes(video.id));
      
      if (newVideos.length === 0) {
        logger.info('All videos already exist in database. Skipping video processing.');
        return this.stats;
      }
      
      logger.info(`Found ${newVideos.length} new videos to process out of ${videos.length} total videos`);
      
      let bonusId;
      for (const video of newVideos) {
        const videoInfo = await youtubeService.getVideoInfo(video.id);
        const videoDescription = videoInfo?.snippet?.description || '';
        const videoTags = videoInfo?.snippet?.tags || [];
        const liveBroadcastContent = videoInfo?.snippet?.liveBroadcastContent;
        const videoType = this.detectVideoType(video.snippet.title, videoDescription, videoTags, liveBroadcastContent);
        if(videoType === 'bonus_video') bonusId = video.id;
      }

      for (const video of newVideos) {
        logger.info(`Processing timestamps and description for video: ${video.id}`);
        await this.processVideoTimestampsAndDescription(video.id, video.snippet.title, bonusId);
        
        // Save the video to the database after processing
        try {
          const videoRecord = new Video({ videoId: video.id });
          await videoRecord.save();
          logger.info(`Saved video ${video.id} to database`);
        } catch (error) {
          logger.error(`Error saving video ${video.id} to database:`, error);
        }
      }
      
      logger.info(`Video automation completed. Stats: ${JSON.stringify(this.stats)}`);
      return this.stats;
    } catch (error) {
      logger.error('Error in video automation:', error);
      throw error;
    }
  }

  // Process comments for a specific video
  async processVideoTimestampsAndDescription(videoId, videoTitle, bonusId) {
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
      // const transcript = await youtubeService.getTranscript(videoId);
      if(videoType === 'bonus_video') {
        await youtubeService.downloadCaptions(videoId);
        const srtFileName = `captions-${videoId}.srt`;
        const zodiacTimeStamps = this.formatZodiacTimestamps(this.extractZodiacTimestampsFromSRT(srtFileName));
        const finialDescription = videoTitle + '\n' + '\n' + zodiacTimeStamps + '\n' + '\n' + `Donations greatly appreciated!
Paypal
https://www.paypal.com/donate/?hosted_button_id=QFALLQ7DZ27B4
Venmo
https://www.venmo.com/u/thetarotship

Thank you so much for being a member! All your support helps me continue to make weekly videos. Thank you! ❤️

MY FAVORITE THINGS! 

My Favorite Earthing Mat (Grounding Inside Your Home)
I do grounding/earthing every day outside, but also indoors with earthing mats. This is the only company I trust. I use one while I do your readings (!), I stand on one in my kitchen while I cook, and one by my bed. I recommend the Earthing mats. It’s the same thing effect as standing on grass, sand or soil, harmonizing your body with the natural frequencies of Earth due to the electron flow – you’re good! https://bit.ly/3QFArUP

Your Sixth Sense - Belleruth Naparstek
My #1 recommendation for books! I read this back in college. I was already having "pyschic pops" but this book helped me use those skills, develop my intuition and learn to trust my gut - always. I credit this book!!
https://amzn.to/4bsSFCk

Astrology Decoded - Sue Merlyn Farebrother 
One of the essential books to learn astrology! Highly recommended for those who want to learn more about aspects, your birth chart, becoming an astrologer, etc.  -https://amzn.to/4bzVfGL

Clear Crystal Quartz! - My favorite crystal. It's perfect for meditation, keeping on your desk, keeping in your purse or tote bag. I usually use crystal quartz when I meditate (secret tip: I often put it on my forehead, aligning with my Third Eye chakra.) - https://amzn.to/3QLSFDU

Snooz White Noise Sound Machine - If you're an overthinker like me (!), get a white noise machine. Perfect for sleeping. I use this every night (Ruby can't sleep without it!). - https://amzn.to/41JeKJD
 
The Only Astrology Book You'll Ever Need - Joanna Martine Woolfolk - This one's great for anyone trying to learn astrology! https://amzn.to/4i7F5Xw

Red Light Therapy at Home - Light is vibration, frequency, everything. This is great for healing, wellness, inflammation, back pain, anti-aging and much more. You can get this as a device, back brace, face mask and more! I use this for Ruby too, which helps her inflammation. https://amzn.to/42QUK7c

Rider-Waite Smith Tarot Deck - The Original! Learn tarot. Great for daily card pulls. https://amzn.to/3F8AplH

Conversation Starter Cards 
Great way to get to know people & improve relationships! 
https://amzn.to/3Y9R7b0

*For those who want to start their own channels, vlog, blog, podcast, these are the ones I use (and switched to and love and recommend):

Insta360 4K, AI-Powered Webcam
https://amzn.to/4laEyGd

RODE Versatile Dynamic Microphone
https://amzn.to/4hZ2EBh
 
All recommendations are affiliate links.

NOTE! Watch your three placements below for your *full* horoscope:
SUN SIGN: Your purpose, core identity. 
RISING SIGN: Your every day interactions and actions, how you want the world to see you, patterns in your life.
MOON SIGN: Your emotions, feelings, intuition, habits, relationship with maternal figures, subconscious. 

To find your birth chart, visit: www.astro-seek.com

Currently not available for private readings ❤️

Follow me!
https://www.Instagram.com/thetarotship
https://www.Facebook.com/thetarotship
https://www.X.com/thetarotship
https://www.Tiktok.com/thetarotship

+++

I Was Contacted By Someone From Proxima Centauri B. Here Are His Messages. - https://youtube.com/live/fHmNhOU9cC8

April 2025: New Era, Channeled Messages, My Predictions, Crystals To Use, Sun vs Rising Sign & More - https://youtube.com/live/K7CY2Pv6TyI

Neptune In Aries 🚀 Why 2025 - 2027 Is Most Crucial For This 14-Year Transit - https://youtube.com/live/prYrHlFUCXU

LEGAL DISCLAIMER:
My tarot readings are for entertainment purposes only. I am an intuitive consultant using my knowledge of astrology, tarot, intuition and divination. I am not a medical professional, and I cannot give legal, financial, or medical advice. Viewers are responsible for how they view the videos, and their interpretations.` + ' BY AUTOMATION';
        
        await youtubeService.updateVideoDescription(videoId, finialDescription);
      } else if(videoType === 'weekly_forecast') {
        const transcript = await youtubeService.getTranscript(videoId);
        const zodiac = this.capitalizeFirstLetter(this.detectZodiacSignforWeeklyVideo(videoTitle, transcript));
        const dateRange = this.extractWeekRange(videoTitle);
        const timestamp = this.detectTarotTransitionFromJson(transcript).timestamp;
        const firstParagraph = `${zodiac}, I begin your forecast with a detailed astrology overview tailored to your sign, which adds more depth, insight and guidance, then your tarot reading: ${timestamp}. I’m proud to be the only astrologer, tarot reader, channeler/clairvoyant to merge these modalities so that you feel you’re receiving a very personalized reading. Check your tarot horoscope for love, career, spiritual growth and more ❤️ 

${dateRange} Extended Bonus Readings (All Signs) Really Good & Legendary - https://youtu.be/${bonusId}`;
        const finialDescription = firstParagraph + '\n' + '\n' + `Consider becoming a member!
https://www.youtube.com/channel/UCzlP6wa5y0dO5lKmcl6VBqA/join
You receive access to wonderful perks (join the community in livestreams with me, bonus spreads, discounts on merch, etc), and your support allows me to continue offering weekly content! 😚🌠 Membership starts at $2/month. Thank you!

Donations greatly appreciated!
Paypal
https://www.paypal.com/donate/?hosted_button_id=QFALLQ7DZ27B4
Venmo
https://www.venmo.com/u/thetarotship

All your support helps me continue to make weekly videos. Thank you! ❤️

MY FAVORITE THINGS! 

My Favorite Earthing Mat (Grounding Inside Your Home)
I do grounding/earthing every day outside, but also indoors with earthing mats. This is the only company I trust. I use one while I do your readings (!), I stand on one in my kitchen while I cook, and one by my bed. I recommend the Earthing mats. It’s the same thing effect as standing on grass, sand or soil, harmonizing your body with the natural frequencies of Earth due to the electron flow – you’re good! https://bit.ly/3QFArUP

Your Sixth Sense - Belleruth Naparstek
My #1 recommendation for books! I read this back in college. I was already having "pyschic pops" but this book helped me use those skills, develop my intuition and learn to trust my gut - always. I credit this book!!
https://amzn.to/4bsSFCk

Astrology Decoded - Sue Merlyn Farebrother 
One of the essential books to learn astrology! Highly recommended for those who want to learn more about aspects, your birth chart, becoming an astrologer, etc.  -https://amzn.to/4bzVfGL

Clear Crystal Quartz! - My favorite crystal. It's perfect for meditation, keeping on your desk, keeping in your purse or tote bag. I usually use crystal quartz when I meditate (secret tip: I often put it on my forehead, aligning with my Third Eye chakra.) - https://amzn.to/3QLSFDU

Snooz White Noise Sound Machine - If you're an overthinker like me (!), get a white noise machine. Perfect for sleeping. I use this every night (Ruby can't sleep without it!). - https://amzn.to/41JeKJD
 
The Only Astrology Book You'll Ever Need - Joanna Martine Woolfolk - This one's great for anyone trying to learn astrology! https://amzn.to/4i7F5Xw

Red Light Therapy at Home - Light is vibration, frequency, everything. This is great for healing, wellness, inflammation, back pain, anti-aging and much more. You can get this as a device, back brace, face mask and more! I use this for Ruby too, which helps her inflammation. https://amzn.to/42QUK7c

Rider-Waite Smith Tarot Deck - The Original! Learn tarot. Great for daily card pulls. https://amzn.to/3F8AplH

Conversation Starter Cards 
Great way to get to know people & improve relationships! 
https://amzn.to/3Y9R7b0

*For those who want to start their own channels, vlog, blog, podcast, these are the ones I use (and switched to and love and recommend):

Insta360 4K, AI-Powered Webcam
https://amzn.to/4laEyGd

RODE Versatile Dynamic Microphone
https://amzn.to/4hZ2EBh
 
All recommendations are affiliate links.

NOTE! Watch your three placements below for your *full* horoscope:
SUN SIGN: Your purpose, core identity. 
RISING SIGN: Your every day interactions and actions, how you want the world to see you, patterns in your life.
MOON SIGN: Your emotions, feelings, intuition, habits, relationship with maternal figures, subconscious. 

To find your birth chart, visit: www.astro-seek.com

Currently not available for private readings ❤️

Follow me!
https://www.Instagram.com/thetarotship
https://www.Facebook.com/thetarotship
https://www.X.com/thetarotship
https://www.Tiktok.com/thetarotship

+++

I Was Contacted By Someone From Proxima Centauri B. Here Are His Messages. - https://youtube.com/live/fHmNhOU9cC8

April 2025: New Era, Channeled Messages, My Predictions, Crystals To Use, Sun vs Rising Sign & More - https://youtube.com/live/K7CY2Pv6TyI

Neptune In Aries 🚀 Why 2025 - 2027 Is Most Crucial For This 14-Year Transit - https://youtube.com/live/prYrHlFUCXU

LEGAL DISCLAIMER:
My tarot readings are for entertainment purposes only. I am an intuitive consultant using my knowledge of astrology, tarot, intuition and divination. I am not a medical professional, and I cannot give legal, financial, or medical advice. Viewers are responsible for how they view the videos, and their interpretations.` + ' BY AUTOMATION';
        
        await youtubeService.updateVideoDescription(videoId, finialDescription);

        const pinnedComment = `${zodiac}, Your tarot reading starts at ${timestamp}, though I discuss what is happening astrologically for all ${zodiac} in the intro. ${dateRange} Extended Bonus Readings (All Signs) - Really Good & Legendary Members: https://youtu.be/${bonusId}`;
        const commentExist = await youtubeService.checkIfVideoHasNoComments(videoId);
        if(commentExist === true) {
          await youtubeService.addTopLevelComment(videoId, pinnedComment);
        }
      } else if(videoType === 'livestream') {

      }
      
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
  extractWeekRange(title) {
    const regex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}-\d{1,2}\b/i;
    const match = title.match(regex);
    return match ? match[0] : null;
  }
  detectZodiacSignforWeeklyVideo(title, transcript = '') {
    const zodiacSigns = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];
  
    const titleLower = title.toLowerCase();
    const transcriptLower = transcript.transcript.toLowerCase();
  
    // Priority 1: Match at the start of the title (e.g. "Taurus -")
    for (const sign of zodiacSigns) {
      if (titleLower.startsWith(sign + ' -')) {
        return sign;
      }
    }
  
    // Priority 2: Search transcript for exact sign mentions
    for (const sign of zodiacSigns) {
      const regex = new RegExp(`\\b${sign}\\b`, 'i');
      if (regex.test(transcriptLower)) {
        return sign;
      }
    }
  
    // Fallback
    return null;
  }
  detectTarotTransitionFromJson(transcriptJson) {
    if (!transcriptJson || !Array.isArray(transcriptJson.segments)) return null;
  
    const tarotMarkers = [
      "let's get started",
      "let's really get started",
      "let's begin your tarot",
      "let's dive in",
      "let's see what's going on for you",
      "i'm going to pull some cards",
      "traditional celtic cross spread",
      "now we're in your tarot reading"
    ];
  
    const segments = transcriptJson.segments;
  
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
  
      // Combine two consecutive texts
      const combinedText = (current.text + ' ' + next.text).toLowerCase();
  
      for (const marker of tarotMarkers) {
        if (combinedText.includes(marker)) {
          return {
            transitionText: current.text + ' ' + next.text,
            timestamp: current.timestamp,
            startTime: parseInt(current.startTimeMs) / 1000
          };
        }
      }
    }
  
    return null; // No match found
  }
  extractZodiacTimestampsFromSRT(filepath) {

    const SIGNS = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    const GREETINGS = ['hi', 'hello'];

    const fullPath = path.resolve(__dirname, filepath);
    const srt = fsSync.readFileSync(fullPath, 'utf-8');
    const cues = parser.fromSrt(srt);
    const result = {};
    const found = new Set();

    for (let i = 0; i < cues.length; i++) {
      const current = this.normalize(cues[i].text);
      const next = i + 1 < cues.length ? this.normalize(cues[i + 1].text) : '';

      for (const sign of SIGNS) {
        if (found.has(sign)) continue;
        const signLower = sign.toLowerCase();

        // Case 1: Greeting and sign in same cue
        const pattern1 = new RegExp(`\\b(${GREETINGS.join('|')})\\s+${signLower}\\b`);
        if (pattern1.test(current)) {
          const timestamp = this.formatTimeToHHMMSS(cues[i].startTime);
          result[sign] = timestamp;
          found.add(sign);
          break;
        }

        // Case 2: Greeting in current cue, sign in next cue
        const pattern2 = new RegExp(`\\b(${GREETINGS.join('|')})\\b`);
        const pattern3 = new RegExp(`\\b${signLower}\\b`);
        if (pattern2.test(current) && pattern3.test(next)) {
          const timestamp = this.formatTimeToHHMMSS(cues[i].startTime);
          result[sign] = timestamp;
          found.add(sign);
          break;
        }
      }
    }

    return result;
  }
  formatSRTTime(srtTime) {
    // Converts SRT format "00:12:33,680" → "00:12:33"
    const [h, m, s] = srtTime.split(':');
    return `${h}:${m}:${s.split(',')[0]}`;
  }
  normalize(text) {
    return text.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  }
  
  formatTimeToHHMMSS(timeStr) {
    const [hours, minutes, rest] = timeStr.split(':');
    const [seconds] = rest.split(',');
    return [hours, minutes, seconds].map(t => String(t).padStart(2, '0')).join(':');
  }
  formatZodiacTimestamps(timestamps) {
    const orderedSigns = [
      'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
      'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
    ];
  
    return orderedSigns
      .map(sign => {
        const key = sign.charAt(0) + sign.slice(1).toLowerCase(); // Capitalize only first letter
        const time = timestamps[key];
        if (!time) return null;
  
        const [hh, mm, ss] = time.split(':');
        const formattedTime = hh === '00' ? `${mm}:${ss}` : `${hh}:${mm}:${ss}`;
        return `${sign}: ${formattedTime}`;
      })
      .filter(Boolean)
      .join('\n');
  }
  capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

module.exports = new VideoAutomation(); 