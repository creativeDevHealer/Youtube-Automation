# YouTube Comment Automation System

An AI-powered YouTube comment automation system designed specifically for tarot/astrology channels. This system automatically processes comments, analyzes sentiment, detects keywords, and performs automated actions like liking, replying, and deleting comments based on configurable rules.

## Features

### 🤖 Automated Comment Processing
- **Heart/like comments** from paid members (Tier 1-3) with positive sentiment
- **Auto-reply** to milestone and praise comments using GPT-4o
- **Delete toxic/spam comments** based on keyword detection
- **Keyword-triggered alerts** for important comments
- **Sentiment analysis** for all comments

### 🎯 Smart Keyword Detection
- **Milestone keywords**: Birthday, promotion, marriage, new job, etc.
- **Praise keywords**: "You're the best", "Congrats!", etc.
- **Negative keywords**: Never like comments with these words
- **Troll keywords**: Automatically delete these comments
- **Alert keywords**: Trigger notifications for important mentions

### 📊 Analytics & Reporting
- **Daily/weekly sentiment analysis reports**
- **Superfan identification and tracking**
- **Member engagement metrics**
- **Keyword statistics and trends**
- **Real-time dashboard with statistics**

### 🔧 Admin Dashboard
- **Real-time statistics** and monitoring
- **Comment search and filtering**
- **Member management**
- **Manual comment processing**
- **Sentiment analysis charts**

## Quick Start

### 1. Prerequisites
- Node.js 16+ and npm
- MongoDB database
- YouTube API credentials
- OpenAI API key
- SMTP email configuration

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd youtube-comment-automation

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

### 3. Configuration

Edit the `.env` file with your credentials:

```env
# YouTube API Configuration
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/google-credentials.json
YOUTUBE_CHANNEL_ID=your_youtube_channel_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
ADMIN_EMAIL=admin@yourdomain.com

# Admin API Key
ADMIN_API_KEY=your_secure_admin_api_key
```

### 4. YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create a service account and download credentials JSON
5. Update `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`

### 5. Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Admin Dashboard

All admin endpoints require the `x-api-key` header with your `ADMIN_API_KEY`.

#### Statistics
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/sentiment-analysis` - Get sentiment analysis data
- `GET /api/admin/keyword-stats` - Get keyword statistics

#### Comments
- `GET /api/admin/comments` - Get recent comments (with pagination)
- `GET /api/admin/comments/:commentId` - Get specific comment
- `GET /api/admin/search-comments` - Search comments

#### Members
- `GET /api/admin/members` - Get channel members
- `GET /api/admin/superfans` - Get superfan list
- `PUT /api/admin/members/:channelId/notes` - Update member notes

#### Automation
- `POST /api/admin/process-comments` - Manually trigger comment processing
- `POST /api/admin/generate-report` - Generate daily report

## Keyword Configuration

The system uses configurable keywords for different actions. Edit `src/config/keywords.js` to customize:

### Milestone Keywords (Auto-reply)
```javascript
milestones: {
  'my birthday': 'Happy birthday! 🥳🎉',
  'promotion': 'Congrats! 🥳🎉',
  'getting married': 'Congrats! 🥳🎉',
  // ... more keywords
}
```

### Negative Keywords (Never like)
```javascript
negative: [
  'depressed', 'anxious', 'scared', 'death',
  'sick', 'illness', 'died', 'cancer', 'funeral'
]
```

### Troll Keywords (Auto-delete)
```javascript
troll: [
  'too long', 'talk too much', 'get to the point',
  'you talk too much', 'finish a sentence'
]
```

## Automation Rules

### Like/Heart Rules
- ✅ **Always like**: Positive comments from Tier 2-3 members
- ✅ **Sometimes like**: Positive comments from Tier 1 members and subscribers
- ❌ **Never like**: Comments with negative keywords or negative sentiment

### Reply Rules
- **Milestone comments**: Auto-reply with congratulations
- **Praise comments**: Auto-reply with thanks
- **Special keywords**: Custom responses (e.g., "Ruby" → "🐶🥰❤️")

### Delete Rules
- **Troll comments**: Automatically deleted
- **Toxic content**: Flagged and deleted
- **Spam**: Removed based on keyword detection

## Monitoring & Alerts

### Daily Reports
- Sent automatically at 9 AM daily
- Includes statistics, trends, and AI-generated insights
- Sent to configured admin email

### Real-time Alerts
- Triggered for important keywords
- Sent immediately via email
- Includes comment details and context

### Dashboard
- Real-time statistics
- Comment processing status
- Member engagement metrics
- Sentiment analysis charts

## Database Schema

### Comment Model
```javascript
{
  commentId: String,
  videoId: String,
  authorChannelId: String,
  textDisplay: String,
  memberStatus: String, // 'none', 'tier1', 'tier2', 'tier3'
  sentiment: {
    label: String, // 'positive', 'negative', 'neutral'
    confidence: Number
  },
  detectedKeywords: Array,
  automationActions: Array,
  toxicity: Object,
  superfanScore: Number,
  processed: Boolean
}
```

### Member Model
```javascript
{
  channelId: String,
  displayName: String,
  membershipLevel: String,
  superfanScore: Number,
  isSuperfan: Boolean,
  totalComments: Number,
  averageSentiment: Number,
  keywordMentions: Object
}
```

## Cron Jobs

The system runs several automated tasks:

- **Comment Processing**: Every 5 minutes
- **Daily Reports**: Daily at 9 AM
- **Superfan Analysis**: Weekly

## Security

- **API Key Authentication**: All admin routes require API key
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: All inputs are validated and sanitized
- **Error Logging**: Comprehensive error logging with Winston

## Troubleshooting

### Common Issues

1. **YouTube API Errors**
   - Check credentials file path
   - Verify API quotas
   - Ensure channel ID is correct

2. **OpenAI API Errors**
   - Verify API key
   - Check account credits
   - Review rate limits

3. **Email Not Sending**
   - Check SMTP configuration
   - Verify email credentials
   - Test with simple email first

### Logs

Logs are stored in `src/logs/`:
- `combined.log` - All logs
- `error.log` - Error logs only

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Check the logs in `src/logs/`
- Review the configuration
- Test individual components
- Contact the development team

## Roadmap

- [ ] Web-based admin dashboard
- [ ] Advanced sentiment analysis
- [ ] Custom response templates
- [ ] Integration with other platforms
- [ ] Mobile app for monitoring
- [ ] Advanced analytics and insights 