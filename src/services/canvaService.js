const axios = require('axios');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class CanvaService {
  constructor() {
    this.initialized = false;
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = null;
    this.initialize();
  }

  initialize() {
    try {
      this.clientId = process.env.CANVA_CLIENT_ID;
      this.clientSecret = process.env.CANVA_CLIENT_SECRET;
      this.redirectUri = process.env.CANVA_REDIRECT_URI;

      if (!this.clientId || !this.clientSecret || !this.redirectUri) {
        logger.warn('Canva credentials not fully configured. Please check environment variables.');
        return;
      }

      this.initialized = true;
      logger.info('Canva service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Canva service:', error);
    }
  }

  async exchangeAuthCodeForToken(authCode, codeVerifier) {
    try {
      if (!this.initialized) {
        throw new Error('Canva service not properly initialized. Check environment variables.');
      }

      logger.info('Starting Canva OAuth token exchange');
      
      // Debug: Log the redirect URI being used
      logger.info('OAuth Request Details:', {
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        hasAuthCode: !!authCode,
        hasCodeVerifier: !!codeVerifier
      });

      // Create Basic Authorization header
      const credentials = `${this.clientId}:${this.clientSecret}`;
      const encodedCredentials = Buffer.from(credentials).toString('base64');

      // Prepare request data
      const requestData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: this.redirectUri
      });

      // Make the token exchange request
      const response = await axios.post(
        'https://api.canva.com/rest/v1/oauth/token',
        requestData,
        {
          headers: {
            'Authorization': `Basic ${encodedCredentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      logger.info('Canva OAuth token exchange successful');
      logger.info('Token response:', {
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        // Don't log the actual tokens for security
        access_token: response.data.access_token ? '[RECEIVED]' : '[NOT_RECEIVED]',
        refresh_token: response.data.refresh_token ? '[RECEIVED]' : '[NOT_RECEIVED]'
      });

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };

    } catch (error) {
      logger.error('Error during Canva OAuth token exchange:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      return {
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      if (!this.initialized) {
        throw new Error('Canva service not properly initialized. Check environment variables.');
      }

      logger.info('Starting Canva token refresh');

      // Create Basic Authorization header
      const credentials = `${this.clientId}:${this.clientSecret}`;
      const encodedCredentials = Buffer.from(credentials).toString('base64');

      // Prepare request data
      const requestData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      // Make the token refresh request
      const response = await axios.post(
        'https://api.canva.com/rest/v1/oauth/token',
        requestData,
        {
          headers: {
            'Authorization': `Basic ${encodedCredentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      logger.info('Canva token refresh successful');
      logger.info('Refresh response:', {
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        access_token: response.data.access_token ? response.data.access_token : '[NOT_RECEIVED]',
        refresh_token: response.data.refresh_token ? response.data.refresh_token : '[NOT_RECEIVED]'
      });

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };

    } catch (error) {
      logger.error('Error during Canva token refresh:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      return {
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  }

  saveTokens(data) {
    try {
      const tokenFile = process.env.CANVA_TOKEN_FILE;
      // Ensure directory exists
      const dir = path.dirname(tokenFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(tokenFile, JSON.stringify(data, null, 2));
      console.log('✅ Tokens updated');
    } catch (error) {
      console.error('❌ Failed to save tokens:', error.message);
      throw error;
    }
  }

  loadTokens() {
    try {
      const tokenFile = process.env.CANVA_TOKEN_FILE;
      if (fs.existsSync(tokenFile)) {
        const raw = fs.readFileSync(tokenFile);
        return JSON.parse(raw);
      }
      else {
        console.log('❌ No tokens file found');
      }
    } catch (error) {
      console.error('❌ Failed to load tokens:', error.message);
    }
  }

  isAccessTokenExpired() {
    try {
      const tokens = this.loadTokens();
      
      // If no access_token or expires_at, consider it expired
      if (!tokens.access_token || !tokens.expires_at) {
        console.log('⚠️ No access token or expiry time found - token considered expired');
        return true;
      }

      const now = Date.now();
      const expiresAt = tokens.expires_at;
      
      // Add 5 minute buffer before actual expiry to be safe
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      const isExpired = now >= (expiresAt - bufferTime);
      
      if (isExpired) {
        console.log('⏰ Access token is expired or will expire soon');
      } else {
        const timeLeft = Math.floor((expiresAt - now) / 1000 / 60); // minutes
        console.log(`✅ Access token is valid for ${timeLeft} more minutes`);
      }
      
      return isExpired;
    } catch (error) {
      console.error('❌ Error checking token expiry:', error.message);
      // On error, assume expired to force refresh
      return true;
    }
  }
  async createDesignFromTemplate(accessToken, brandTemplateId, zodiacSign, weekRange, textField1, textField2, textField3) {
    const url = `https://api.canva.com/rest/v1/autofills`;
  
    try {
      const response = await axios.post(
        url,
        {
          title: "Automated Thumbnail",
          brand_template_id: brandTemplateId,
          data: {
            'zodiacSign': {
              type: "text",
              text: zodiacSign,
            },
            'weekRange': {
              type: "text",
              text: weekRange,
            },
            'textField1': {
              type : "text",
              text : textField1,
            },
            'textField2': {
              type : "text",
              text : textField2,
            },
            'textField3': {
              type : "text",
              text : textField3,
            }
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      // console.log(response);
      return response.data.job;
  
    } catch (err) {
      console.error("❌ Error creating design from template:", err.response?.data || err.message);
      return null;
    }
  }
  async getDesignFromAutofillJobId(accessToken, autofillJobId) {
    const url = `https://api.canva.com/rest/v1/autofills/${autofillJobId}`;
  
    try {
      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      // console.log(response);
      return response.data.job;
  
    } catch (err) {
      console.error("❌ Error creating design from template:", err.response?.data || err.message);
      return null;
    }
  }
  async createDesignExportJob(accessToken, designId) {
    const url = `https://api.canva.com/rest/v1/exports`;
  
    try {
      const response = await axios.post(
        url,
        {
          design_id: designId,
          format : {
            "type" : "png",
          }
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      // console.log(response);
      return response.data.job;
  
    } catch (err) {
      console.error("❌ Error creating design from template:", err.response?.data || err.message);
      return null;
    }
  }
  async getDesignExportFromJobId(accessToken, jobId) {
    const url = `https://api.canva.com/rest/v1/exports/${jobId}`;
  
    try {
      const response = await axios.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      return response.data.job;
  
    } catch (err) {
      console.error("❌ Error creating design from template:", err.response?.data || err.message);
      return null;
    }
  }
  async ensureValidAccessToken() {
    try {
      if (this.isAccessTokenExpired()) {
        // Load current tokens to get refresh_token
        const currentTokens = this.loadTokens();
        if (!currentTokens.refresh_token) {
          throw new Error('No refresh token available');
        }

        // Refresh the access token using canvaService
        const newTokens = await this.refreshAccessToken(currentTokens.refresh_token);
        const {
          access_token,
          refresh_token: newRefreshToken,
          expires_in,
          token_type,
        } = newTokens.data;
  
        const updatedTokens = {
          access_token,
          refresh_token: newRefreshToken || currentTokens.refresh_token,
          token_type,
          expires_at: Date.now() + expires_in * 1000,
        };
        // Save the updated tokens
        this.saveTokens(updatedTokens);
        
        console.log('✅ Access token refreshed successfully');
        return newTokens.data.access_token;
      } else {
        // Token is still valid, return current access token
        const tokens = this.loadTokens();
        return tokens.access_token;
      }
    } catch (error) {
      console.error('❌ Failed to ensure valid access token:', error.message);
      throw error;
    }
  }
  async getBrandTemplateDataset(brandTemplateId, accessToken) {
    try {
      const response = await axios.get(`https://api.canva.com/rest/v1/brand-templates/${brandTemplateId}/dataset`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching brand template dataset:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }

}

module.exports = new CanvaService(); 