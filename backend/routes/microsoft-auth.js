const express = require('express');
const microsoftTodoService = require('../services/microsoftTodoService');
const { logError, logInfo } = require('../services/logService');
const router = express.Router();

/**
 * GET /auth/microsoft/callback
 * Handle Microsoft OAuth callback
 */
router.get('/microsoft/callback', async (req, res) => {
    try {
        console.log('[MICROSOFT AUTH] OAuth callback received');
        console.log('[MICROSOFT AUTH] Query params:', req.query);
        console.log('[MICROSOFT AUTH] Session ID:', req.sessionID);
        
        const { code, error } = req.query;
        
        if (error) {
            console.log('[MICROSOFT AUTH] OAuth error:', error);
            logError('Microsoft OAuth error', { error });
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8090'}/profile?error=microsoft_auth_failed`);
        }

        if (!code) {
            console.log('[MICROSOFT AUTH] No authorization code received');
            logError('No authorization code received from Microsoft');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8090'}/profile?error=no_auth_code`);
        }

        console.log('[MICROSOFT AUTH] Exchanging code for tokens...');
        // Exchange code for tokens
        const tokenData = await microsoftTodoService.getAccessToken(code);
        console.log('[MICROSOFT AUTH] Token exchange successful');
        
        // Store tokens in session
        req.session.microsoftTodo = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at
        };
        console.log('[MICROSOFT AUTH] Tokens stored in session');

        logInfo('Microsoft OAuth callback successful');
        
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:8090'}/profile?microsoft_connected=true`;
        console.log('[MICROSOFT AUTH] Redirecting to:', redirectUrl);
        
        // Redirect back to frontend with success
        res.redirect(redirectUrl);
    } catch (error) {
        console.log('[MICROSOFT AUTH] Callback failed:', error);
        logError('Microsoft OAuth callback failed', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8090'}/profile?error=microsoft_auth_failed`);
    }
});

module.exports = router;
