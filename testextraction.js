const fs = require('fs');
const parser = require('subtitles-parser');

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const GREETINGS = ['hi', 'hello'];

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, '').trim();
}

function formatTimeToHHMMSS(timeStr) {
  const [hours, minutes, rest] = timeStr.split(':');
  const [seconds] = rest.split(',');
  return [hours, minutes, seconds].map(t => String(t).padStart(2, '0')).join(':');
}

function extractZodiacTimestampsFromSRT(filePath) {
  const srt = fs.readFileSync(filePath, 'utf-8');
  const cues = parser.fromSrt(srt);
  const result = {};
  const found = new Set();

  for (let i = 0; i < cues.length; i++) {
    const current = normalize(cues[i].text);
    const next = i + 1 < cues.length ? normalize(cues[i + 1].text) : '';

    for (const sign of SIGNS) {
      if (found.has(sign)) continue;
      const signLower = sign.toLowerCase();

      // Case 1: Greeting and sign in same cue
      const pattern1 = new RegExp(`\\b(${GREETINGS.join('|')})\\s+${signLower}\\b`);
      if (pattern1.test(current)) {
        const timestamp = formatTimeToHHMMSS(cues[i].startTime);
        result[sign] = timestamp;
        found.add(sign);
        console.log(`[Strict Match] ${sign}: "${cues[i].text}" -> ${timestamp}`);
        break;
      }

      // Case 2: Greeting in current cue, sign in next cue
      const pattern2 = new RegExp(`\\b(${GREETINGS.join('|')})\\b`);
      const pattern3 = new RegExp(`\\b${signLower}\\b`);
      if (pattern2.test(current) && pattern3.test(next)) {
        const timestamp = formatTimeToHHMMSS(cues[i].startTime);
        result[sign] = timestamp;
        found.add(sign);
        break;
      }
    }
  }

  return result;
}

// USAGE
const filePath = 'src/services/captions-CbL5HoPgPXk.srt';
const timestamps = extractZodiacTimestampsFromSRT(filePath);
function formatZodiacTimestamps(timestamps) {
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

const finalresult = formatZodiacTimestamps(timestamps);
console.log(finalresult);
// console.log('\n✅ Final S/trict Zodiac Greeting Timestamps:\n', timestamps);
