const express = require('express');
const router = express.Router();
const ResearchJobService = require('../services/researchJobService');
const { Task } = require('../models');
const permissionsService = require('../services/permissionsService');

router.post('/research-jobs', async (req, res) => {
    try {
        const { query, taskId, sendEmail } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // If taskId is provided, verify user has access to the task
        if (taskId) {
            const task = await Task.findByPk(taskId, { attributes: ['uid'] });
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            const access = await permissionsService.getAccess(
                req.currentUser.id,
                'task',
                task.uid
            );
            if (access === 'none') {
                return res.status(403).json({ error: 'Forbidden' });
            }
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

router.get('/research-jobs', async (req, res) => {
    try {
        const { taskId } = req.query;
        if (taskId) {
            // Verify user has access to the task before showing jobs
            const task = await Task.findByPk(taskId, { attributes: ['uid'] });
            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            const access = await permissionsService.getAccess(
                req.currentUser.id,
                'task',
                task.uid
            );
            if (access === 'none') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const jobs = await ResearchJobService.getJobsByUserAndTask(req.currentUser.id, taskId);
            res.json({ jobs });
        } else {
            const jobs = await ResearchJobService.getJobsByUser(req.currentUser.id);
            res.json({ jobs });
        }
    } catch (error) {
        console.error('Error fetching research jobs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/research-jobs/:id', async (req, res) => {
    try {
        const job = await ResearchJobService.getJob(req.params.id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Check if user owns the job
        if (job.user_id !== req.currentUser.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // If job is associated with a task, verify user has access to that task
        if (job.task_id) {
            const task = await Task.findByPk(job.task_id, { attributes: ['uid'] });
            if (task) {
                const access = await permissionsService.getAccess(
                    req.currentUser.id,
                    'task',
                    task.uid
                );
                if (access === 'none') {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }
        }

        res.json({ job });
    } catch (error) {
        console.error('Error fetching research job:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
