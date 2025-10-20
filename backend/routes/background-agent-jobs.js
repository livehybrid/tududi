const express = require('express');
const router = express.Router();
const BackgroundAgentService = require('../services/backgroundAgentService');

router.post('/background-agent-jobs', async (req, res) => {
    try {
        const { query, taskId, sendEmail } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        const job = await BackgroundAgentService.createJob({
            userId: req.currentUser.id,
            taskId,
            query,
            sendEmail,
        });
        res.json({ job });
    } catch (error) {
        console.error('Error creating background agent job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/background-agent-jobs', async (req, res) => {
    try {
        const { taskId } = req.query;
        if (taskId) {
            const jobs = await BackgroundAgentService.getJobsByUserAndTask(req.currentUser.id, taskId);
            res.json({ jobs });
        } else {
            const jobs = await BackgroundAgentService.getJobsByUser(req.currentUser.id);
            res.json({ jobs });
        }
    } catch (error) {
        console.error('Error fetching background agent jobs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/background-agent-jobs/:id', async (req, res) => {
    try {
        const job = await BackgroundAgentService.getJob(req.params.id);
        if (!job || job.user_id !== req.currentUser.id) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ job });
    } catch (error) {
        console.error('Error fetching background agent job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 