const { ResearchJob, User } = require('../models');
const openRouter = require('./openRouter');
const emailService = require('./emailService');

class ResearchJobService {
    static async createJob({
        userId,
        taskId = null,
        query,
        sendEmail = false,
    }) {
        return await ResearchJob.create({
            user_id: userId,
            task_id: taskId,
            query,
            send_email: sendEmail,
            status: 'pending',
        });
    }

    static async getJob(id) {
        return await ResearchJob.findByPk(id);
    }

    static async getJobsByUser(userId) {
        return await ResearchJob.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
        });
    }

    static async getJobsByUserAndTask(userId, taskId) {
        return await ResearchJob.findAll({
            where: {
                user_id: userId,
                task_id: taskId,
            },
            order: [['created_at', 'DESC']],
        });
    }

    static async processPendingJobs(limit = 5) {
        const jobs = await ResearchJob.findAll({
            where: { status: 'pending' },
            limit,
        });

        for (const job of jobs) {
            try {
                const result = await openRouter.chatCompletion(job.query);
                job.result = result;
                job.status = 'completed';

                if (job.send_email && !job.email_sent) {
                    const user = await User.findByPk(job.user_id);
                    if (user && user.email) {
                        await emailService.sendEmail({
                            to: user.email,
                            subject: `Research results for "${job.query}"`,
                            text: result,
                        });
                        job.email_sent = true;
                    }
                }

                await job.save();
            } catch (error) {
                job.status = 'error';
                job.error = error.message;
                await job.save();
            }
        }
    }
}

module.exports = ResearchJobService;
