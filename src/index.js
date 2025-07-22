const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cron = require('node-cron');
const path = require('path');

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

// Security middleware with CSP configured for admin dashboard
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://code.jquery.com",
        "https://cdn.jsdelivr.net",
        "https://cdn.datatables.net"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: [
        "'self'", 
        "https://cdn.jsdelivr.net",
        "https://cdn.datatables.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "'unsafe-inline'"
      ],
      fontSrc: [
        "'self'", 
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from views directory
app.use('/views', express.static(path.join(__dirname, 'views')));

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
app.use('/admin', adminRoutes);

// Initialize automation services
async function initializeServices() {
  try {
    // Start comment automation (runs every 1 hour)
    cron.schedule('0 * * * *', async () => {
      logger.info('Starting comment automation cycle');
      await commentAutomation.processComments();
    });

    // Start video automation (runs every 1 hour)
    cron.schedule('0 * * * *', async () => {
      logger.info('Starting video automation cycle');
      await videoAutomation.processVideos();
    });

    logger.info('Automation services initialized (comments, videos, thumbnails)');
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