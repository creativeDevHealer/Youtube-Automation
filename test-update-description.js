const youtubeService = require('./src/services/youtubeService');
const logger = require('./src/utils/logger');
require('dotenv').config();

async function testUpdateVideoDescription() {
  try {
    console.log('=== Testing getRecentVideos2 function ===');
    console.log('Video ID:', 'DWDIzRi2D6w');

    const videoId = 'DWDIzRi2D6w';
    const newDescription = 'Sagittarius, I begin your forecast with a detailed astrology overview tailored to your sign, which adds more depth, insight and guidance, then your tarot reading: 39:34. I’m proud to be the only astrologer, tarot reader, channeler/clairvoyant to merge these modalities so that you feel you’re receiving a very personalized reading. Check your tarot horoscope for love, career, spiritual growth and more ❤️ \n' +
        '\n' +
        'JULY 14-20 BONUS Extended Readings (All 12 Signs) -- Really Good & Legendary Members - https://youtu.be/CbL5HoPgPXk\n' +
        '\n' +
        'Consider becoming a member!\n' +
        'https://www.youtube.com/channel/UCzlP6wa5y0dO5lKmcl6VBqA/join\n' +
        'You receive access to wonderful perks (join the community in livestreams with me, bonus spreads, discounts on merch, etc), and your support allows me to continue offering weekly content! 😚🌠 Membership starts at $2/month. Thank you!\n' +
        '\n' +
        'Donations greatly appreciated!\n' +
        'Paypal\n' +
        'https://www.paypal.com/donate/?hosted_button_id=QFALLQ7DZ27B4\n' +
        'Venmo\n' +
        'https://www.venmo.com/u/thetarotship\n' +
        '\n' +
        'MY FAVORITE THINGS! \n' +
        '\n' +
        'My Favorite Earthing Mat (Grounding Inside Your Home)\n' +
        'I do grounding/earthing every day outside, but also indoors with earthing mats. This is the only company I trust. I use one while I do your readings (!), I stand on one in my kitchen while I cook, and one by my bed. I recommend the Earthing mats. It’s the same thing effect as standing on grass, sand or soil, harmonizing your body with the natural frequencies of Earth due to the electron flow – you’re good! https://bit.ly/3QFArUP\n' +
        '\n' +
        'Your Sixth Sense - Belleruth Naparstek\n' +
        'My #1 recommendation for books! I read this back in college. I was already having "pyschic pops" but this book helped me use those skills, develop my intuition and learn to trust my gut - always. I credit this book!!\n' +        'https://amzn.to/4bsSFCk\n' +
        '\n' +
        'Astrology Decoded - Sue Merlyn Farebrother \n' +
        'One of the essential books to learn astrology! Highly recommended for those who want to learn more about aspects, your birth chart, becoming an astrologer, etc.  -https://amzn.to/4bzVfGL\n' +
        '\n' +
        "Clear Crystal Quartz! - My favorite crystal. It's perfect for meditation, keeping on your desk, keeping in your purse or tote bag. I usually use crystal quartz when I meditate (secret tip: I often put it on my forehead, aligning with my Third Eye chakra.) - https://amzn.to/3QLSFDU\n" +
        '\n' +
        "Snooz White Noise Sound Machine - If you're an overthinker like me (!), get a white noise machine. Perfect for sleeping. I use this every night (Ruby can't sleep without it!). - https://amzn.to/41JeKJD\n" +
        ' \n' +
        "The Only Astrology Book You'll Ever Need - Joanna Martine Woolfolk - This one's great for anyone trying to learn astrology! https://amzn.to/4i7F5Xw\n" +
        ' Red Light Therapy at Home - Light is vibration, frequency, everything. This is great for healing, wellness, inflammation, back pain, anti-aging and much more. You can get this as a device, back brace, face mask and more! I use this for Ruby too, which helps her inflammation. https://amzn.to/42QUK7c\n' +
        '\n' +
        'Rider-Waite Smith Tarot Deck - The Original! Learn tarot. Great for daily card pulls. https://amzn.to/3F8AplH\n' +
        '\n' +
        'Conversation Starter Cards \n' +
        'Great way to get to know people & improve relationships! \n' +
        'https://amzn.to/3Y9R7b0\n' +
        '\n' +
        '*For those who want to start their own channels, vlog, blog, podcast, these are the ones I use (and switched to and love and recommend):\n' +
        '\n' +
        'Insta360 4K, AI-Powered Webcam\n' +
        'https://amzn.to/4laEyGd\n' +
        '\n' +
        'RODE Versatile Dynamic Microphone\n' +
        'https://amzn.to/4hZ2EBh\n' +
        '\n' +
        'All recommendations are affiliate links.\n' +
        '\n' +
        'NOTE! Watch your three placements below for your *full* horoscope:\n' +
        'SUN SIGN: Your purpose, core identity. \n' +
        'RISING SIGN: Your every day interactions and actions, how you want the world to see you, patterns in your life.\n' +
        'MOON SIGN: Your emotions, feelings, intuition, habits, relationship with maternal figures, subconscious. \n' +
        '\n' +
        'To find your birth chart, visit: www.astro-seek.com\n' +
        '\n' +
        'Currently not available for private readings ❤️\n' +
        '\n' +
        'Follow me!\n' +
        'https://www.Instagram.com/thetarotship\n' +
        'https://www.Facebook.com/thetarotship\n' +
        'https://www.X.com/thetarotship\n' +
        'https://www.Tiktok.com/thetarotship\n' +
        '\n' +
        '+++\n' +
        '\n' +
        'I Was Contacted By Someone From Proxima Centauri B. Here Are His Messages. - https://youtube.com/live/fHmNhOU9cC8\n' +
        '\n' +
        'April 2025: New Era, Channeled Messages, My Predictions, Crystals To Use, Sun vs Rising Sign & More - https://youtube.com/live/K7CY2Pv6TyI\n' +
        '\n' +
        'Neptune In Aries 🚀 Why 2025 - 2027 Is Most Crucial For This 14-Year Transit - https://youtube.com/live/prYrHlFUCXU\n' +
        '\n' +
        'LEGAL DISCLAIMER:\n' +
        'My tarot readings are for entertainment purposes only. I am an intuitive consultant using my knowledge of astrology, tarot, intuition and divination. I am not a medical professional, and I cannot give legal, financial, or medical advice. Viewers are responsible for how they view the videos, and their interpretations.\n' +
        '\n' +
        '#sagittarius #horoscope #tarotreading #tarot #july #mercuryretrograde' + 'by api';
    const newDescription1 = `
    ARIES: 00:00
TAURUS: 00:12
GEMINI: 00:20
CANCER: 00:34
LEO: 00:46
VIRGO: 00:57
LIBRA: 01:11
SCORPIO: 01:25
SAGITTARIUS: 01:35
CAPRICORN: 01:43
AQUARIUS: 01:55
PISCES: 02:04`;
    youtubeService.updateVideoDescription(videoId, newDescription);
      
  } catch (error) {
    logger.error('Error testing getRecentVideos2:', error);
  }
}

async function checkIfVideoHasNoComments() {
    const videoId = 'DWDIzRi2D6w';
    const result = youtubeService.checkIfVideoHasNoComments(videoId);
    if(result === true)
        console.log(1);
    else
        console.log(0);
}

async function addTopLevelComment() {
  const videoId = 'DWDIzRi2D6w';
  youtubeService.addTopLevelComment(videoId, "Top Level comment")
}
async function downloadCaptions() {
  const videoId = 'F-9a_qMaarA';
  youtubeService.downloadCaptions(videoId);
}

// Run the test
testUpdateVideoDescription(); 