const express = require('express');
const router = express.Router();
const CommentAction = require('../models/CommentAction');
const ProcessedVideo = require('../models/ProcessedVideo');
const logger = require('../utils/logger');
const path = require('path');
const canvaService = require('../services/canvaService');
const youtubeService = require('../services/youtubeService');
const axios = require('axios');
const fs = require('fs');

// Middleware to check admin authentication
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  
  if (!process.env.ADMIN_API_KEY) {
    logger.error('ADMIN_API_KEY not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Dashboard route - serve the HTML page (no auth required)
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin-dashboard.html'));
});

// Apply auth middleware to API routes only
router.use(requireAuth);

// API endpoint for CommentActions - DataTables compatible
router.get('/comment-actions', async (req, res) => {
  try {
    // Debug: Log all query parameters
    logger.info('Comment Actions API called with params:', req.query);
    
    // Extract parameters with multiple possible formats
    const draw = parseInt(req.query.draw) || 1;
    const start = parseInt(req.query.start) || 0;
    const length = parseInt(req.query.length) || 10;
    const searchValue = req.query['search[value]'] || req.query.search?.value || '';
    const orderColumn = parseInt(req.query['order[0][column]']) || 0;
    const orderDir = req.query['order[0][dir]'] || 'desc';
    
    // Debug: Log extracted values
    logger.info('Extracted parameters:', {
      draw, start, length, searchValue, orderColumn, orderDir
    });

    // Define column mapping for sorting
    const columns = [
      'processedAt',
      'videoTitle', 
      'actionType',
      'commentText',
      'authorDisplayName',
      'memberStatus',
      'reason',
      'actions' // Not sortable
    ];

    // Build search query
    let searchQuery = {};
    if (searchValue && searchValue.trim() && searchValue.trim().length > 0) {
      try {
        // Escape special regex characters to prevent errors
        const escapedSearch = searchValue.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        searchQuery = {
          $or: [
            { videoTitle: searchRegex },
            { commentText: searchRegex },
            { authorDisplayName: searchRegex },
            { actionType: searchRegex },
            { reason: searchRegex }
          ]
        };
        logger.info('Search query constructed:', { searchValue: searchValue.trim(), searchQuery });
      } catch (error) {
        logger.error('Error constructing search regex:', error);
        // If regex fails, fall back to text search
        searchQuery = {
          $or: [
            { videoTitle: { $regex: searchValue.trim(), $options: 'i' } },
            { commentText: { $regex: searchValue.trim(), $options: 'i' } },
            { authorDisplayName: { $regex: searchValue.trim(), $options: 'i' } },
            { actionType: { $regex: searchValue.trim(), $options: 'i' } },
            { reason: { $regex: searchValue.trim(), $options: 'i' } }
          ]
        };
      }
    }

    // Build sort object
    const sortColumn = columns[parseInt(orderColumn)] || 'processedAt';
    const sortDirection = orderDir === 'asc' ? 1 : -1;
    const sort = { [sortColumn]: sortDirection };

    // Get total count
    const totalRecords = await CommentAction.countDocuments();
    const filteredRecords = await CommentAction.countDocuments(searchQuery);

    // Get paginated data
    const data = await CommentAction
      .find(searchQuery)
      .sort(sort)
      .skip(parseInt(start))
      .limit(parseInt(length))
      .lean();

    // Format data for DataTables
    const formattedData = data.map(item => {
      const actionButtons = `
        <div class="btn-group btn-group-sm" role="group">
          <button type="button" class="btn btn-outline-primary btn-sm" 
                  onclick="viewCommentAction('${item._id}')" 
                  title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-outline-success btn-sm" 
                  onclick="window.open('https://youtube.com/watch?v=${item.videoId}', '_blank')" 
                  title="View on YouTube">
            <i class="fab fa-youtube"></i>
          </button>
        </div>
      `;
      
      return [
        new Date(item.processedAt).toLocaleString(),
        item.videoTitle,
        item.actionType,
        item.commentText.substring(0, 100) + (item.commentText.length > 100 ? '...' : ''),
        item.authorDisplayName || 'N/A',
        item.memberStatus || 'none',
        item.reason || 'N/A',
        actionButtons
      ];
    });

    res.json({
      draw: parseInt(draw),
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data: formattedData
    });

  } catch (error) {
    logger.error('Error fetching comment actions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for ProcessedVideos - DataTables compatible
router.get('/processed-videos', async (req, res) => {
  try {
    // Debug: Log all query parameters
    logger.info('Processed Videos API called with params:', req.query);
    
    // Extract parameters with multiple possible formats
    const draw = parseInt(req.query.draw) || 1;
    const start = parseInt(req.query.start) || 0;
    const length = parseInt(req.query.length) || 10;
    const searchValue = req.query['search[value]'] || req.query.search?.value || '';
    const orderColumn = parseInt(req.query['order[0][column]']) || 0;
    const orderDir = req.query['order[0][dir]'] || 'desc';
    
    // Debug: Log extracted values
    logger.info('Extracted parameters:', {
      draw, start, length, searchValue, orderColumn, orderDir
    });

    // Define column mapping for sorting
    const columns = [
      'createdAt',
      'videoTitle',
      'videoType',
      'zodiacSign',
      'weekRange',
      'updatedAt',
      'actions' // Not sortable
    ];

    // Build search query
    let searchQuery = {};
    if (searchValue && searchValue.trim() && searchValue.trim().length > 0) {
      try {
        // Escape special regex characters to prevent errors
        const escapedSearch = searchValue.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        searchQuery = {
          $or: [
            { videoTitle: searchRegex },
            { videoType: searchRegex },
            { zodiacSign: searchRegex },
            { weekRange: searchRegex }
          ]
        };
        logger.info('Search query constructed:', { searchValue: searchValue.trim(), searchQuery });
      } catch (error) {
        logger.error('Error constructing search regex:', error);
        // If regex fails, fall back to text search
        searchQuery = {
          $or: [
            { videoTitle: { $regex: searchValue.trim(), $options: 'i' } },
            { videoType: { $regex: searchValue.trim(), $options: 'i' } },
            { zodiacSign: { $regex: searchValue.trim(), $options: 'i' } },
            { weekRange: { $regex: searchValue.trim(), $options: 'i' } }
          ]
        };
      }
    }

    // Build sort object
    const sortColumn = columns[parseInt(orderColumn)] || 'createdAt';
    const sortDirection = orderDir === 'asc' ? 1 : -1;
    const sort = { [sortColumn]: sortDirection };

    // Get total count
    const totalRecords = await ProcessedVideo.countDocuments();
    const filteredRecords = await ProcessedVideo.countDocuments(searchQuery);

    // Get paginated data
    const data = await ProcessedVideo
      .find(searchQuery)
      .sort(sort)
      .skip(parseInt(start))
      .limit(parseInt(length))
      .lean();

    // Format data for DataTables
    const formattedData = data.map(item => {
      const actionButtons = `
        <div class="btn-group btn-group-sm" role="group">
          <button type="button" class="btn btn-outline-primary btn-sm" 
                  onclick="viewProcessedVideo('${item._id}')" 
                  title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-outline-success btn-sm" 
                  onclick="window.open('https://youtube.com/watch?v=${item.videoId}', '_blank')" 
                  title="View on YouTube">
            <i class="fab fa-youtube"></i>
          </button>
        </div>
      `;
      
      return [
        new Date(item.createdAt).toLocaleString(),
        item.videoTitle,
        item.videoType,
        item.zodiacSign || 'N/A',
        item.weekRange || 'N/A',
        new Date(item.updatedAt).toLocaleString(),
        actionButtons
      ];
    });

    res.json({
      draw: parseInt(draw),
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data: formattedData
    });

  } catch (error) {
    logger.error('Error fetching processed videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    logger.info('Fetching dashboard statistics...');
    
    const [
      repliedCommentCount,
      deletedCommentCount,
      bonusVideoCount,
      weeklyVideoCount,
      totalCommentActions,
      totalProcessedVideos,
      recentActions
    ] = await Promise.all([
      CommentAction.countDocuments({ actionType: 'replied' }),
      CommentAction.countDocuments({ actionType: 'deleted' }),
      ProcessedVideo.countDocuments({ videoType: 'bonus_video' }),
      ProcessedVideo.countDocuments({ videoType: 'weekly_forecast' }),
      CommentAction.countDocuments(),
      ProcessedVideo.countDocuments(),
      CommentAction.countDocuments({
        processedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    const stats = {
      repliedCommentCount,
      deletedCommentCount,
      bonusVideoCount,
      weeklyVideoCount,
      totalCommentActions,
      totalProcessedVideos,
      recentActions
    };

    logger.info('Dashboard stats:', stats);
    res.json(stats);

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Thumbnail generation endpoint
router.post('/generate-thumbnail', async (req, res) => {
  try {
    logger.info('Starting thumbnail generation request:', req.body);
    
    const { title, content, subtitle, weekRange, thumbnailStyle } = req.body;
    
    // Validate required fields
    if (!title || !content || !subtitle || !weekRange) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, content, subtitle, weekRange' 
      });
    }

    // Template IDs mapping (from test file)
    const templateIds = [
      'EAGtUY5UqvY', 'EAGteElF23I', 'EAGteEpJf-k', 'EAGteTqYqwc'
    ];
    
    // Zodiac signs in order (from test file)
    const orderedSigns = [
      'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
      'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
    ];

    // Map thumbnailStyle to template ID (default to first template)
    let selectedTemplateId = templateIds[0];
    switch (thumbnailStyle) {
      case 'template1':
        selectedTemplateId = templateIds[0];
        break;
      case 'template2':
        selectedTemplateId = templateIds[1];
        break;
      case 'template3':
        selectedTemplateId = templateIds[2];
        break;
      case 'template4':
        selectedTemplateId = templateIds[3];
        break;
    }

    logger.info(`Using template ID: ${selectedTemplateId} for style: ${thumbnailStyle}`);

    // Helper function for delays
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Generate thumbnails for all zodiac signs with automatic retry
    const results = [];
    const errors = [];

    for (const sign of orderedSigns) {
      let retryCount = 0;
      const maxRetries = 2; // Will try 3 times total (initial + 2 retries)
      let lastError = null;

      while (retryCount <= maxRetries) {
        try {
          const attemptLabel = retryCount === 0 ? 'Starting' : `Retrying (${retryCount}/${maxRetries})`;
          logger.info(`🚀 ${attemptLabel} generation for: ${sign}`);
          
          // Get valid access token
          const validToken = await canvaService.ensureValidAccessToken();
          
          // Create design from template
          const autofillJob = await canvaService.createDesignFromTemplate(
            validToken, 
            selectedTemplateId, 
            sign, 
            weekRange, 
            title, 
            content, 
            subtitle
          );

          if (!autofillJob) {
            throw new Error(`Failed to create autofill job for ${sign}`);
          }

          logger.info(`Autofill job created for ${sign}:`, autofillJob.id);
          
          // Wait for autofill to complete (longer wait for retries)
          const waitTime = retryCount === 0 ? 3000 : 4000 + (retryCount * 1000);
          await delay(waitTime);
          
          // Get design from autofill job with polling
          let jobData = null;
          let pollAttempts = 0;
          const maxPollAttempts = 3;
          
          while (!jobData && pollAttempts < maxPollAttempts) {
            try {
              jobData = await canvaService.getDesignFromAutofillJobId(validToken, autofillJob.id);
              if (!jobData || !jobData.result || !jobData.result.design) {
                pollAttempts++;
                if (pollAttempts < maxPollAttempts) {
                  logger.warn(`Job not ready yet for ${sign}, polling again in 2s... (${pollAttempts}/${maxPollAttempts})`);
                  await delay(2000);
                  jobData = null; // Reset for next iteration
                }
              }
            } catch (pollError) {
              pollAttempts++;
              if (pollAttempts < maxPollAttempts) {
                logger.warn(`Poll error for ${sign}, retrying in 2s:`, pollError.message);
                await delay(2000);
              } else {
                throw pollError;
              }
            }
          }
          
          if (!jobData || !jobData.result || !jobData.result.design) {
            throw new Error(`Failed to get design for ${sign} after ${maxPollAttempts} polling attempts`);
          }

          logger.info(`Design created for ${sign}:`, jobData.result.design.id);
          
          // Create export job
          const exportRes = await canvaService.createDesignExportJob(validToken, jobData.result.design.id);
          
          if (!exportRes) {
            throw new Error(`Failed to create export job for ${sign}`);
          }

          logger.info(`Export job created for ${sign}:`, exportRes.id);
          
          // Wait for export to complete (longer wait for retries)
          const exportWaitTime = retryCount === 0 ? 3000 : 4000 + (retryCount * 1000);
          await delay(exportWaitTime);
          
          // Get export result with polling
          let designData = null;
          pollAttempts = 0;
          
          while (!designData && pollAttempts < maxPollAttempts) {
            try {
              designData = await canvaService.getDesignExportFromJobId(validToken, exportRes.id);
              if (!designData || !designData.urls || designData.urls.length === 0) {
                pollAttempts++;
                if (pollAttempts < maxPollAttempts) {
                  logger.warn(`Export not ready yet for ${sign}, polling again in 2s... (${pollAttempts}/${maxPollAttempts})`);
                  await delay(2000);
                  designData = null; // Reset for next iteration
                }
              }
            } catch (pollError) {
              pollAttempts++;
              if (pollAttempts < maxPollAttempts) {
                logger.warn(`Export poll error for ${sign}, retrying in 2s:`, pollError.message);
                await delay(2000);
              } else {
                throw pollError;
              }
            }
          }
          
          if (!designData || !designData.urls || designData.urls.length === 0) {
            throw new Error(`Failed to get download URL for ${sign} after ${maxPollAttempts} polling attempts`);
          }

          const downloadUrl = designData.urls[0];
          logger.info(`Download URL for ${sign}:`, downloadUrl);

          // Download and save the thumbnail with longer timeout for retries
          const timeout = retryCount === 0 ? 15000 : 30000;
          const imgRes = await axios.get(downloadUrl, { 
            responseType: 'stream',
            timeout: timeout
          });
          
          const outputPath = path.resolve(`./src/views/thumbnails/thumbnail-${sign.toLowerCase()}.png`);
          
          // Ensure thumbnails directory exists
          const thumbnailsDir = path.dirname(outputPath);
          if (!fs.existsSync(thumbnailsDir)) {
            fs.mkdirSync(thumbnailsDir, { recursive: true });
          }
          
          const writer = fs.createWriteStream(outputPath);
          imgRes.data.pipe(writer);
          
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          results.push({
            sign,
            status: 'success',
            filePath: outputPath,
            downloadUrl,
            attempts: retryCount + 1
          });

          const successMessage = retryCount === 0 
            ? `✅ Thumbnail generated successfully for ${sign}`
            : `✅ Thumbnail generated successfully for ${sign} on attempt ${retryCount + 1}`;
          logger.info(successMessage);
          
          // Success! Break out of retry loop
          break;
          
        } catch (error) {
          lastError = error;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            const waitBeforeRetry = 2000 * retryCount; // Exponential backoff
            logger.warn(`❌ Attempt ${retryCount} failed for ${sign}: ${error.message}. Retrying in ${waitBeforeRetry}ms...`);
            await delay(waitBeforeRetry);
          } else {
            logger.error(`❌ All ${maxRetries + 1} attempts failed for ${sign}:`, error.message);
            errors.push({
              sign,
              error: error.message,
              attempts: maxRetries + 1
            });
          }
        }
      }
      
      // Optional pause between signs to avoid rate limiting
      await delay(1000);
    }

    // Return response
    const response = {
      success: true,
      message: `Thumbnail generation completed. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      generatedCount: results.length,
      failedCount: errors.length
    };

    logger.info('Thumbnail generation completed:', {
      successful: results.length,
      failed: errors.length
    });

    res.json(response);

  } catch (error) {
    logger.error('Error in thumbnail generation endpoint:', error);
    res.status(500).json({ 
      error: 'Thumbnail generation failed',
      message: error.message 
    });
     }
 });

// Update video thumbnails endpoint
router.post('/update-thumbnails', async (req, res) => {
  try {
    logger.info('Starting thumbnail update request:', req.body);
    
    const { videoUpdates } = req.body;
    
    // Validate required fields
    if (!videoUpdates || typeof videoUpdates !== 'object') {
      return res.status(400).json({ 
        error: 'Missing required field: videoUpdates (object)' 
      });
    }

    const videoIds = Object.keys(videoUpdates);
    if (videoIds.length === 0) {
      return res.status(400).json({ 
        error: 'No video IDs provided for thumbnail updates' 
      });
    }

    logger.info(`Processing thumbnail updates for ${videoIds.length} videos`);

    const results = [];
    const errors = [];

    for (const videoId of videoIds) {
      try {
        const updateInfo = videoUpdates[videoId];
        const { zodiacSign, thumbnailPath } = updateInfo;

        logger.info(`🔄 Updating thumbnail for video ${videoId} (${zodiacSign})`);

        // Get the full file path
        const fullThumbnailPath = path.resolve(`./src${thumbnailPath}`);
        
        // Check if thumbnail file exists
        if (!fs.existsSync(fullThumbnailPath)) {
          throw new Error(`Thumbnail file not found: ${fullThumbnailPath}`);
        }

        // Use YouTube API to update the thumbnail
        const updateResult = await youtubeService.updateVideoThumbnail(videoId, fullThumbnailPath);
        
        if (updateResult.success) {
          results.push({
            videoId,
            zodiacSign,
            status: 'success',
            thumbnailPath: fullThumbnailPath
          });
          logger.info(`✅ Thumbnail updated successfully for ${videoId} (${zodiacSign})`);
        } else {
          throw new Error(updateResult.error || 'Unknown error updating thumbnail');
        }

      } catch (error) {
        logger.error(`❌ Failed to update thumbnail for ${videoId}:`, error.message);
        errors.push({
          videoId,
          zodiacSign: videoUpdates[videoId]?.zodiacSign || 'Unknown',
          error: error.message
        });
      }

      // Small delay between updates to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Return response
    const response = {
      success: true,
      message: `Thumbnail update completed. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      successCount: results.length,
      failedCount: errors.length,
      totalRequested: videoIds.length
    };

    logger.info('Thumbnail update completed:', {
      successful: results.length,
      failed: errors.length,
      total: videoIds.length
    });

    res.json(response);

  } catch (error) {
    logger.error('Error in thumbnail update endpoint:', error);
    res.status(500).json({ 
      error: 'Thumbnail update failed',
      message: error.message 
    });
  }
});
// Get single comment action by ID
router.get('/comment-action/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const commentAction = await CommentAction.findById(id);
    
    if (!commentAction) {
      return res.status(404).json({ error: 'Comment action not found' });
    }
    
    res.json(commentAction);
  } catch (error) {
    logger.error('Error fetching comment action:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Get single processed video by ID
router.get('/processed-video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const processedVideo = await ProcessedVideo.findById(id);
    
    if (!processedVideo) {
      return res.status(404).json({ error: 'Processed video not found' });
    }
    
    res.json(processedVideo);
  } catch (error) {
    logger.error('Error fetching processed video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


 
 module.exports = router; 