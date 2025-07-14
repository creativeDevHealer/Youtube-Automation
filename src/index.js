const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const required = ['YOUTUBE_CHANNEL_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Optional but recommended
  const recommended = ['OPENAI_API_KEY', 'MONGODB_URI'];
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missingRecommended.length > 0) {
    logger.warn(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    logger.warn('Some features may be disabled without these variables.');
  }

  logger.info('Environment validation completed');
}

// Import modules
const commentAutomation = require('./services/commentAutomation');
const videoAutomation = require('./services/videoAutomation');
const adminRoutes = require('./routes/admin');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-comment-assistant', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('Connected to MongoDB'))
.catch(err => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize automation services
async function initializeServices() {
  try {
    // Start comment automation (runs every 1 hour)
    cron.schedule('0 * * * *', async () => {
      logger.info('Starting comment automation cycle');
      await commentAutomation.processComments();
    });

    // Start video automation (runs every 1 hour)
    cron.schedule('*0 * * * *', async () => {
      logger.info('Starting video automation cycle');
      await videoAutomation.processVideos();
    });

    // Generate daily report (runs daily at 9 AM)
    // cron.schedule('0 9 * * *', async () => {
    //   logger.info('Generating daily sentiment analysis report');
    //   await commentAutomation.generateDailyReport();
    // });

    logger.info('Comment automation services initialized');
  } catch (error) {
    logger.error('Error initializing services:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  validateEnvironment();
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 