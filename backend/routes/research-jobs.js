const express = require('express');
const router = express.Router();
const ResearchJobService = require('../services/researchJobService');

router.post('/research-jobs', async (req, res) => {
    try {
        const { query, taskId, sendEmail } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        const job = await ResearchJobService.createJob({
            userId: req.currentUser.id,
            taskId,
            query,
            sendEmail,
        });
        res.json({ job });
    } catch (error) {
        console.error('Error creating research job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/research-jobs/:id', async (req, res) => {
    try {
        const job = await ResearchJobService.getJob(req.params.id);
        if (!job || job.user_id !== req.currentUser.id) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ job });
    } catch (error) {
        console.error('Error fetching research job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
