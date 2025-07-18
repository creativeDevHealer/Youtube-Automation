const dotenv = require('dotenv');
dotenv.config();

const canvaService = require('./src/services/canvaService');
const logger = require('./src/utils/logger');
async function CanvaOAuth() {
  try {
    logger.info('Starting Canva OAuth');

    const authCode = 'eyJraWQiOiJlODZiMTIwMy1iMWY1LTQ4N2MtYjBiOS0yN2U0MmI2ZjMzZDkiLCJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJoV0J2S2xsOHl0N2VJVE13ZGU0WHpnIiwiY2xpZW50X2lkIjoiT0MtQVpmblphRktBSEI5IiwiYXVkIjoiaHR0cHM6Ly93d3cuY2FudmEuY29tIiwiaWF0IjoxNzUyODAxNjEyLCJuYmYiOjE3NTI4MDE2MTIsImV4cCI6MTc1MjgwMjIxMiwicm9sZXMiOiJ2WVpHWTFKUmc5NWZkZkhBOUQyRGJ4RUotQmV6UnFKQ0tKczJrUXZHTHUwcE01ZEpmeDFOQ0N3YTJMbDJaRm1taDNtQmNJQW1zcHZBTkFMWDBrdVROazFYYTlIcG5QMnlsS0gyQk4yem1oM182MlE2aXEwNnlTMURFMjQ1UzFfVUZCdnVfR3MxcEtHdVMwLWJ3bkJETkdJekNPUSIsInN1YiI6Im9VWEIyenBpTUl0N0ltRWlxTWdGU2siLCJicmFuZCI6Im9CWEIyU2tESnBYdzFMVUVfOE85b0kiLCJzY29wZXMiOlsiYnJhbmR0ZW1wbGF0ZTpjb250ZW50OnJlYWQiLCJkZXNpZ246cGVybWlzc2lvbjpyZWFkIiwiYnJhbmR0ZW1wbGF0ZTptZXRhOnJlYWQiLCJwcm9maWxlOnJlYWQiLCJhcHA6cmVhZCIsImRlc2lnbjpjb250ZW50OndyaXRlIiwiZGVzaWduOnBlcm1pc3Npb246d3JpdGUiLCJkZXNpZ246bWV0YTpyZWFkIiwiZGVzaWduOmNvbnRlbnQ6cmVhZCIsImFzc2V0OnJlYWQiLCJjb21tZW50OnJlYWQiLCJhc3NldDp3cml0ZSJdLCJsb2NhbGUiOiJZRGlRYzhUcVlGNU5NejJkN1N5MVhlbzRyNnNETWczd2hxRDIwUGtPY1pRSHh2V1FuSUpaaVMyYnlZdm1VUS1wQmc3RG5RIiwiYnVuZGxlcyI6WyJQUk9TIl0sInBrY2UiOiJRdG01SFc2YmNHTUFySUR3cl9TbFVoampTd2pEclRzTm94ekZVXzg2T2ZFVV9XWnJ5TGVjVHQzVlVtSVFaajZUQ3IxNFF0SnppVnNLT3hJcm5tNjdxcFB6anNDNW9GY0dWUDdNQnhHUWt3UWZxbGYyIiwicmVkaXJlY3RfdXJpIjoiaHR0cDovLzEyNy4wLjAuMTozMDAxL29hdXRoL3JlZGlyZWN0In0.fwlXUz63dGL1Ue5tO_wTEPyux7MouXRUHNsqGv3-XkidG77lr2qYIYH3NossIUij1MK_Uf59-Tn4TkWlkvfKPsjQjzKacC0i0lyvE58VOwWIXopJjrGH_FFG4im4DtNKl_oXOfYfg23wksLrGojDJGbFgdq9X_uCGAXVLgQ0MS1iAJxpTX34D5Z0UcOoMVODUssCheCWf6wVHePE7eGiU7l0VC7JEH-MVTJIx9LtR4JCkJ7K1BfVyQa-lyUh74hgP8dy9vwudzLIKoMjybnun_1XoLlXkgHsT8DdihnH8yIHitRMQ4l8P-4-HfVnf91_rfvs9WXB4y4AyiHiNIJxhA';
    const codeVerifier = 'kN09Ut5QQwV69tClQzz9R9uyK_hREI0rVpKoyZVabBy0X_0nrqS37hkHsPBM_lvr6tNaZ96_7KwsrVJINntczTic843zodp8hIY4bcUM9-zD08qbyz6OLSV-_WXYEeLp';

    console.log('================================================');

    // Test token exchange
    const tokenResult = await canvaService.exchangeAuthCodeForToken(authCode, codeVerifier);
    
    if (tokenResult.success) {
      console.log('✅ Token exchange successful!');
      const {
        access_token,
        refresh_token,
        expires_in,
        token_type,
      } = tokenResult.data;

      const updatedTokens = {
        access_token,
        refresh_token,
        token_type,
        expires_at: Date.now() + expires_in * 1000,
      };
  
      canvaService.saveTokens(updatedTokens);

    } else {
      console.log('❌ Token exchange failed:', tokenResult.error);
    }

  } catch (error) {
    logger.error('Error in Canva OAuth test:', error);
  }
}

if (require.main === module) {
  // Check if environment variables are set
  if (!process.env.CANVA_CLIENT_ID || !process.env.CANVA_CLIENT_SECRET || !process.env.CANVA_REDIRECT_URI) {
    console.log('⚠️  Warning: Canva environment variables not set!');
  } else {
    console.log('✅ Canva credentials configured');
    CanvaOAuth();
  }
}

module.exports = {
  CanvaOAuth
}; 