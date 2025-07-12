const OpenAI = require('openai');
const logger = require('../utils/logger');
const keywords = require('../config/keywords');

class AIService {
  constructor() {
    this.openai = null;
    this.initialize();
  }

  initialize() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      logger.info('OpenAI client initialized successfully');
    } else {
      logger.warn('OpenAI API key not configured. AI features will be disabled.');
    }
  }

  // Analyze comment sentiment and detect keywords
  async analyzeComment(commentText) {
    try {
      
      // return this.basicKeywordAnalysis(commentText);
      if (!this.openai) {
        logger.warn('OpenAI not configured. Using basic keyword detection.');
      }

      const prompt = `Analyze the following YouTube comment for sentiment and toxicity. Return a JSON object with:
1. sentiment: object with "label" ("positive", "negative", or "neutral"), "confidence" (0-1), and "score" (0-1)
2. detectedKeywords: array of detected keywords with categories (for reference only)
3. toxicity: boolean indicating if comment contains toxic/abusive content that should be deleted

Comment: "${commentText}"

Focus on:
- Sentiment analysis (positive/negative/neutral)
- Toxicity detection (harassment, abuse, spam-like behavior)
- General keyword detection for these categories: "negative", "troll", "milestone", "praise", "special", "alert"

Keywords for reference:
- negative: ${keywords.negative.join(', ')}
- troll: ${keywords.troll.join(', ')}
- milestone: ${Object.keys(keywords.milestones).join(', ')}
- praise: ${Object.keys(keywords.praise).join(', ')}
- special: ${Object.keys(keywords.special).join(', ')}
- alert: ${keywords.alerts.join(', ')}

Rules for toxicity:
- Mark as toxic if comment contains harassment, abuse, excessive negativity, or spam-like content
- Consider context and intent, not just keyword presence
- Be more lenient with constructive criticism vs. pure trolling

Return only valid JSON with this structure:
{
  "sentiment": {
    "label": "positive|negative|neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-1.0
  },
  "detectedKeywords": [
    {"keyword": "detected word", "category": "category_name"}
  ],
  "toxicity": true|false
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      let content = response.choices[0].message.content.trim();
      

      // Extract JSON from markdown code blocks if present
      if (content.includes('```json')) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
      } else if (content.includes('```')) {
        // Handle other code blocks
        const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
      }

      const analysis = JSON.parse(content);
      
      logger.info(`Comment analyzed: ${commentText.substring(0, 50)}...`);
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing comment:', error);
      logger.info('Falling back to basic keyword analysis');
      return this.basicKeywordAnalysis(commentText);
    }
  }

  // Generate auto-reply for comments
  async generateReply(commentText, memberTier = null) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not configured. Using default reply.');
        return this.getDefaultReply(memberTier);
      }

      const prompt = `Generate a friendly, authentic reply to this YouTube comment. The reply should be:
- Under 100 characters
- Warm and engaging
- Appropriate for a tarot/astrology channel
- Personalized based on member tier if applicable

Comment: "${commentText}"
Member Tier: ${memberTier || 'Regular subscriber'}

Reply:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      });

      const reply = response.choices[0].message.content.trim();
      logger.info(`Generated reply: ${reply}`);
      
      return reply;
    } catch (error) {
      logger.error('Error generating reply:', error);
      return this.getDefaultReply(memberTier);
    }
  }

  // Get default reply when OpenAI is not available
  getDefaultReply(memberTier = null) {
    const replies = {
      tier1: ['Thank you for your support! 💫', 'You\'re amazing! ✨', 'Love your energy! 🌟'],
      tier2: ['Thank you for being here! 💫', 'You\'re incredible! ✨', 'Blessed to have you! 🌟'],
      tier3: ['Thank you for your incredible support! 💫', 'You\'re absolutely amazing! ✨', 'So grateful for you! 🌟'],
      default: ['Thank you for your comment! 💫', 'Appreciate you! ✨', 'Thanks for watching! 🌟']
    };

    const tierReplies = replies[memberTier] || replies.default;
    return tierReplies[Math.floor(Math.random() * tierReplies.length)];
  }

  // Basic keyword analysis when OpenAI is not available
  basicKeywordAnalysis(commentText) {
    const lowerText = commentText.toLowerCase();
    const detectedKeywords = [];
    let toxicity = false;

    // Check for negative keywords
    const negativeKeywords = keywords.negative.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    if (negativeKeywords.length > 0) {
      detectedKeywords.push(...negativeKeywords.map(k => ({ keyword: k, category: 'negative' })));
    }

    // Check for troll keywords
    const trollKeywords = keywords.troll.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    if (trollKeywords.length > 0) {
      detectedKeywords.push(...trollKeywords.map(k => ({ keyword: k, category: 'troll' })));
      toxicity = true;
    }

    // Check for milestone keywords
    for (const keyword of Object.keys(keywords.milestones)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedKeywords.push({ keyword, category: 'milestone' });
      }
    }

    // Check for praise keywords
    for (const keyword of Object.keys(keywords.praise)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedKeywords.push({ keyword, category: 'praise' });
      }
    }

    // Check for special keywords
    for (const keyword of Object.keys(keywords.special)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedKeywords.push({ keyword, category: 'special' });
      }
    }

    // Check for alert keywords
    const alertKeywords = keywords.alerts.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    if (alertKeywords.length > 0) {
      detectedKeywords.push(...alertKeywords.map(k => ({ keyword: k, category: 'alert' })));
    }

    // Check for positive indicators
    const positiveWords = keywords.positive;
    let positiveCount = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) positiveCount++;
    });

    // Determine sentiment based on keywords and content analysis
    let sentiment;
    if (negativeKeywords.length > 0 || trollKeywords.length > 0) {
      sentiment = { 
        label: 'negative', 
        confidence: Math.min(0.9, 0.6 + (negativeKeywords.length + trollKeywords.length) * 0.1),
        score: 0.2
      };
      // High negative confidence should trigger toxicity
      if (sentiment.confidence > 0.8) toxicity = true;
    } else if (detectedKeywords.some(k => k.category === 'milestone' || k.category === 'praise') || positiveCount > 0) {
      const confidence = Math.min(0.8, 0.6 + positiveCount * 0.1);
      sentiment = { 
        label: 'positive', 
        confidence: confidence,
        score: confidence
      };
    } else {
      sentiment = { 
        label: 'neutral', 
        confidence: 0.5,
        score: 0.5
      };
    }

    return {
      sentiment,
      detectedKeywords,
      toxicity
    };
  }

  // Generate daily sentiment analysis report
  async generateDailyReport(stats) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not configured. Using basic report generation.');
        return this.generateBasicReport(stats);
      }

      const prompt = `Generate a daily sentiment analysis report for a YouTube tarot/astrology channel.

Stats: ${JSON.stringify(stats)}

Create a concise, professional summary highlighting:
- Key achievements
- Notable trends
- Areas of concern
- Recommendations

Keep it under 200 words and use a friendly, professional tone.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 300
      });

      const summary = response.choices[0].message.content;
      logger.info('Generated daily report summary');
      
      return summary;
    } catch (error) {
      logger.error('Error generating daily report:', error);
      return this.generateBasicReport(stats);
    }
  }

  // Generate basic report when OpenAI is not available
  generateBasicReport(stats) {
    const { totalComments, likedComments, repliedComments, deletedComments, positiveSentiment, negativeSentiment } = stats;
    
    let summary = `Daily Automation Report - ${new Date().toLocaleDateString()}\n\n`;
    summary += `📊 Activity Summary:\n`;
    summary += `• Total comments processed: ${totalComments}\n`;
    summary += `• Comments liked: ${likedComments}\n`;
    summary += `• Comments replied to: ${repliedComments}\n`;
    summary += `• Comments deleted: ${deletedComments}\n`;
    summary += `• Positive sentiment: ${positiveSentiment}%\n`;
    summary += `• Negative sentiment: ${negativeSentiment}%\n\n`;

    if (positiveSentiment > 70) {
      summary += `🌟 Great day! High positive engagement from your community.\n`;
    } else if (negativeSentiment > 30) {
      summary += `⚠️ Higher negative sentiment detected. Consider reviewing moderation settings.\n`;
    } else {
      summary += `✨ Balanced engagement with room for growth.\n`;
    }

    return summary;
  }

  // Generate superfan identification criteria
  async identifySuperfans(memberData) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not configured. Using basic superfan identification.');
        return this.identifyBasicSuperfans(memberData);
      }

      const prompt = `Analyze the following member data to identify potential superfans for a YouTube tarot/astrology channel.

Member Data: ${JSON.stringify(memberData)}

Identify superfans based on:
- High engagement (comments, likes, replies)
- Positive sentiment in comments
- Frequent milestone/praise keyword usage
- Consistent activity over time
- Membership level (Tier 2-3 preferred)

Return a JSON array of superfan candidates with scores and reasons.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      const superfans = JSON.parse(response.choices[0].message.content);
      logger.info(`Identified ${superfans.length} potential superfans`);
      
      return superfans;
    } catch (error) {
      logger.error('Error identifying superfans:', error);
      return this.identifyBasicSuperfans(memberData);
    }
  }

  // Basic superfan identification when OpenAI is not available
  identifyBasicSuperfans(memberData) {
    const superfans = [];
    
    for (const member of memberData) {
      let score = 0;
      const reasons = [];

      // Score based on membership tier
      if (member.tier === 'tier3') {
        score += 30;
        reasons.push('Premium membership (Tier 3)');
      } else if (member.tier === 'tier2') {
        score += 20;
        reasons.push('Supporting membership (Tier 2)');
      } else if (member.tier === 'tier1') {
        score += 10;
        reasons.push('Basic membership (Tier 1)');
      }

      // Score based on engagement
      if (member.commentCount > 10) {
        score += 25;
        reasons.push('High comment frequency');
      } else if (member.commentCount > 5) {
        score += 15;
        reasons.push('Regular commenter');
      }

      // Score based on positive sentiment
      if (member.positiveSentiment > 80) {
        score += 20;
        reasons.push('Very positive engagement');
      } else if (member.positiveSentiment > 60) {
        score += 10;
        reasons.push('Positive engagement');
      }

      // Score based on milestone/praise keywords
      if (member.milestoneKeywords > 5) {
        score += 15;
        reasons.push('Frequent milestone celebrations');
      } else if (member.praiseKeywords > 3) {
        score += 10;
        reasons.push('Regular praise and support');
      }

      // Consider as superfan if score is high enough
      if (score >= 50) {
        superfans.push({
          memberId: member.memberId,
          name: member.name,
          score,
          reasons,
          tier: member.tier,
          commentCount: member.commentCount,
          positiveSentiment: member.positiveSentiment
        });
      }
    }

    // Sort by score descending
    superfans.sort((a, b) => b.score - a.score);
    
    logger.info(`Identified ${superfans.length} potential superfans using basic criteria`);
    return superfans;
  }
}

module.exports = new AIService(); 