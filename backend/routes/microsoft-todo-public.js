const express = require('express');
const microsoftTodoService = require('../services/microsoftTodoService');
const { logError, logInfo } = require('../services/logService');
const router = express.Router();

/**
 * GET /api/microsoft-todo/auth-url
 * Get Microsoft OAuth authorization URL
 */
router.get('/auth-url', async (req, res) => {
    try {
        const authUrl = microsoftTodoService.getAuthorizationUrl();
        res.json({ authUrl });
    } catch (error) {
        logError('Failed to get Microsoft auth URL', error);
        res.status(500).json({ error: 'Failed to get authorization URL' });
    }
});

/**
 * GET /api/microsoft-todo/status
 * Get Microsoft ToDo connection status (public - no auth required)
 */
router.get('/status', async (req, res) => {
    try {
        const { access_token, expires_at } = req.session.microsoftTodo || {};

        if (!access_token) {
            return res.json({ connected: false });
        }

        const isExpired = expires_at && Date.now() > expires_at;

        res.json({
            connected: !isExpired,
            expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        });
    } catch (error) {
        logError('Failed to get Microsoft ToDo status', error);
        res.status(500).json({ error: 'Failed to get connection status' });
    }
});

/**
 * POST /api/microsoft-todo/exchange-token
 * Exchange authorization code for access token
 */
router.post('/exchange-token', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res
                .status(400)
                .json({ error: 'Authorization code is required' });
        }

        const tokenData = await microsoftTodoService.getAccessToken(code);

        // Store token data in user session or database
        req.session.microsoftTodo = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
        };

        logInfo(
            `Microsoft ToDo token exchanged for user ${req.session.userId || 'anonymous'}`
        );
        res.json({
            success: true,
            message: 'Successfully connected to Microsoft ToDo',
        });
    } catch (error) {
        logError('Failed to exchange Microsoft token', error);
        res.status(500).json({ error: 'Failed to connect to Microsoft ToDo' });
    }
});

/**
 * POST /api/microsoft-todo/refresh-token
 * Refresh Microsoft access token
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const tokenData =
            await microsoftTodoService.refreshAccessToken(refresh_token);

        // Update stored token data
        req.session.microsoftTodo = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
        };

        logInfo(
            `Microsoft ToDo token refreshed for user ${req.session.userId || 'anonymous'}`
        );
        res.json({ success: true, tokenData });
    } catch (error) {
        logError('Failed to refresh Microsoft token', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

module.exports = router;
