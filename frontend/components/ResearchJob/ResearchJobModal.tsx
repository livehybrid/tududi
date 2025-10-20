import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { fetchResearchJob, ResearchJob } from '../../utils/researchJobsService';

interface ResearchJobModalProps {
    jobId: number;
    onClose: () => void;
}

const ResearchJobModal: React.FC<ResearchJobModalProps> = ({ jobId, onClose }) => {
    const { t } = useTranslation();
    const [job, setJob] = useState<ResearchJob | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const loadJob = async () => {
            try {
                const data = await fetchResearchJob(jobId);
                setJob(data);
                if (data.status === 'completed' || data.status === 'error') {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch research job', err);
                setLoading(false);
            }
        };

        loadJob();
        interval = setInterval(loadJob, 2000);
        return () => clearInterval(interval);
    }, [jobId]);

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-md max-w-lg w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                        {t('researchJob.title', 'Research Result')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        &times;
                    </button>
                </div>
                {loading && (
                    <div>
                        {t('researchJob.loading', 'Processing research...')}
                    </div>
                )}
                {!loading && job && (
                    <div className="max-h-96 overflow-y-auto whitespace-pre-wrap">
                        {job.status === 'completed'
                            ? job.result
                            : job.error ||
                              t('researchJob.noResult', 'No result available')}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ResearchJobModal;

