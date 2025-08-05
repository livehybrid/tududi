const express = require('express');
const router = express.Router();
const mcpService = require('../services/mcpService');

// Establish SSE connection
router.get('/mcp/stream', (req, res) => {
    mcpService.addClient(req.currentUser.id, res);
});

// Close SSE connection
router.delete('/mcp/stream', (req, res) => {
    mcpService.removeAllClients(req.currentUser.id);
    res.status(204).end();
});

// Receive MCP messages
router.post('/mcp/messages', (req, res) => {
    const { id, type, payload } = req.body || {};
    if (!id || !type || typeof payload === 'undefined') {
        return res.status(400).json({ error: 'Invalid MCP message' });
    }
    mcpService.send(req.currentUser.id, { id, type, payload });
    res.status(202).json({ status: 'accepted' });
});

module.exports = router;
