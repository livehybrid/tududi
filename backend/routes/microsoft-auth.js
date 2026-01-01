const express = require('express');
const microsoftTodoService = require('../services/microsoftTodoService');
const { logError, logInfo } = require('../services/logService');
const { User } = require('../models');
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
        console.log('[MICROSOFT AUTH] Session ID:', req.sessionID);
        console.log('[MICROSOFT AUTH] Session user ID:', req.session.userId);
        console.log('[MICROSOFT AUTH] Session data:', req.session);
        
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

        // Store tokens in database for persistence
        const userId = req.session.userId;
        console.log('[MICROSOFT AUTH] Storing tokens for user ID:', userId);
        
        if (!userId) {
            console.log('[MICROSOFT AUTH] ERROR: No user ID in session');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8090'}/profile?error=no_user_session`);
        }
        
        await User.update({
            microsoft_todo_access_token: tokenData.access_token,
            microsoft_todo_refresh_token: tokenData.refresh_token,
            microsoft_todo_expires_at: tokenData.expires_at,
            microsoft_todo_connected: true
        }, {
            where: { id: userId }
        });
        console.log('[MICROSOFT AUTH] Tokens stored in database');

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

/**
 * GET /auth/microsoft/status
 * Check Microsoft Todo connection status
 */
router.get('/microsoft/status', async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await User.findByPk(req.session.userId, {
            attributes: [
                'id',
                'microsoft_todo_connected',
                'microsoft_todo_access_token',
                'microsoft_todo_refresh_token',
                'microsoft_todo_expires_at'
            ]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if tokens are expired
        let isConnected = user.microsoft_todo_connected;
        
        logInfo(`[DEBUG] Microsoft Todo status check for user ${req.session.userId}:`, {
            connected: user.microsoft_todo_connected,
            hasAccessToken: !!user.microsoft_todo_access_token,
            hasRefreshToken: !!user.microsoft_todo_refresh_token,
            expiresAt: user.microsoft_todo_expires_at,
            sessionMicrosoftTodo: !!req.session.microsoftTodo
        });
        if (isConnected && user.microsoft_todo_expires_at) {
            const now = new Date();
            const expiresAt = new Date(user.microsoft_todo_expires_at);
            if (now >= expiresAt) {
                // Try to refresh token
                try {
                    const newTokenData = await microsoftTodoService.refreshAccessToken(user.microsoft_todo_refresh_token);
                    
                    // Update tokens in database
                    await user.update({
                        microsoft_todo_access_token: newTokenData.access_token,
                        microsoft_todo_refresh_token: newTokenData.refresh_token,
                        microsoft_todo_expires_at: newTokenData.expires_at
                    });

                    // Update session
                    req.session.microsoftTodo = {
                        access_token: newTokenData.access_token,
                        refresh_token: newTokenData.refresh_token,
                        expires_at: newTokenData.expires_at
                    };

                    isConnected = true;
                } catch (refreshError) {
                    logError('Failed to refresh Microsoft Todo token', refreshError);
                    // Disconnect if refresh fails
                    await user.update({
                        microsoft_todo_connected: false,
                        microsoft_todo_access_token: null,
                        microsoft_todo_refresh_token: null,
                        microsoft_todo_expires_at: null
                    });
                    isConnected = false;
                }
            }
        }

        // If connected but no session tokens, restore from database
        if (isConnected && !req.session.microsoftTodo) {
            req.session.microsoftTodo = {
                access_token: user.microsoft_todo_access_token,
                refresh_token: user.microsoft_todo_refresh_token,
                expires_at: user.microsoft_todo_expires_at
            };
        }

        res.json({ connected: isConnected });
    } catch (error) {
        logError('Failed to check Microsoft Todo status', error);
        res.status(500).json({ error: 'Failed to check connection status' });
    }
});

module.exports = router;
