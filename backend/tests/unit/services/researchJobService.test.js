const ResearchJobService = require('../../../services/researchJobService');

describe('ResearchJobService', () => {
    it('should export required methods', () => {
        expect(typeof ResearchJobService.createJob).toBe('function');
        expect(typeof ResearchJobService.getJob).toBe('function');
        expect(typeof ResearchJobService.processPendingJobs).toBe('function');
    });
});
