const { BackgroundAgentJob, User } = require('../models');
const openRouter = require('./openRouter');
const emailService = require('./emailService');

class BackgroundAgentService {
    static async createJob({ userId, taskId = null, query, sendEmail = false }) {
        return await BackgroundAgentJob.create({
            user_id: userId,
            task_id: taskId,
            query,
            send_email: sendEmail,
            status: 'pending',
        });
    }

    static async getJob(id) {
        return await BackgroundAgentJob.findByPk(id);
    }

    static async getJobsByUser(userId) {
        return await BackgroundAgentJob.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: 50,
        });
    }

    static async getJobsByUserAndTask(userId, taskId) {
        return await BackgroundAgentJob.findAll({
            where: { 
                user_id: userId,
                task_id: taskId 
            },
            order: [['created_at', 'DESC']],
        });
    }

    static async processPendingJobs(limit = 5) {
        const jobs = await BackgroundAgentJob.findAll({
            where: { status: 'pending' },
            include: [{ model: User, as: 'User' }],
            limit,
        });

        for (const job of jobs) {
            try {
                // Get user's OpenRouter API key
                const user = await User.findByPk(job.user_id);
                if (!user || !user.background_agent_enabled || !user.openrouter_api_key) {
                    job.status = 'error';
                    job.error = 'Background agent not enabled or no API key configured';
                    await job.save();
                    continue;
                }

                // Build user context from user preferences and settings (only if enabled)
                let userContext = null;
                if (user.include_user_context !== false) {
                    userContext = [
                        `User email: ${user.email}`,
                        `Task intelligence enabled: ${user.task_intelligence_enabled}`,
                        `Auto suggest next actions enabled: ${user.auto_suggest_next_actions_enabled}`,
                        `Productivity assistant enabled: ${user.productivity_assistant_enabled}`,
                        `Next task suggestion enabled: ${user.next_task_suggestion_enabled}`,
                        `Background agent enabled: ${user.background_agent_enabled}`,
                        `Pomodoro enabled: ${user.pomodoro_enabled}`,
                        `Language: ${user.language || 'en'}`,
                        `Timezone: ${user.timezone || 'UTC'}`,
                        `Appearance: ${user.appearance || 'system'}`
                    ].join(', ');
                }

                const result = await openRouter.chatCompletion(job.query, user.openrouter_api_key, userContext);
                job.result = result;
                job.status = 'completed';

                if (job.send_email && !job.email_sent) {
                    if (user.email) {
                        await emailService.sendEmail({
                            to: user.email,
                            subject: `Background agent results for "${job.query}"`,
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

module.exports = BackgroundAgentService; 