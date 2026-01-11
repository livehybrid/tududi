const BackgroundAgentService = require('./backgroundAgentService');

class BackgroundJobProcessor {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }

    start() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.interval = setInterval(async () => {
            try {
                await BackgroundAgentService.processPendingJobs(5);
            } catch (error) {
                console.error('Error processing background jobs:', error);
            }
        }, 30000); // Process jobs every 30 seconds

        console.log('Background job processor started');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('Background job processor stopped');
    }

    async processJobs() {
        try {
            await BackgroundAgentService.processPendingJobs(5);
        } catch (error) {
            console.error('Error processing background jobs:', error);
        }
    }
}

module.exports = new BackgroundJobProcessor();
