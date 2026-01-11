import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { fetchBackgroundAgentJobs, type BackgroundAgentJob } from '../../utils/backgroundAgentService';
import BackgroundAgentModal from './BackgroundAgentModal';

const BackgroundAgentJobsList: React.FC = () => {
    const { t } = useTranslation();
    const [jobs, setJobs] = useState<BackgroundAgentJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobsData = await fetchBackgroundAgentJobs();
                setJobs(jobsData);
            } catch (error) {
                console.error('Failed to load background agent jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadJobs();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'error':
                return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
            case 'pending':
                return <ClockIcon className="w-4 h-4 text-yellow-500 animate-spin" />;
            default:
                return <MagnifyingGlassIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return t('backgroundAgent.completed', 'Completed');
            case 'error':
                return t('backgroundAgent.error', 'Error');
            case 'pending':
                return t('backgroundAgent.processing', 'Processing...');
            default:
                return t('backgroundAgent.unknown', 'Unknown');
        }
    };

    if (loading) {
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('backgroundAgent.loading', 'Loading...')}
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('backgroundAgent.noJobs', 'No background agent jobs found')}
            </div>
        );
    }

    return (
        <>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {jobs.map((job) => (
                    <div
                        key={job.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => setSelectedJobId(job.id)}
                    >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {getStatusIcon(job.status)}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {job.query}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {getStatusText(job.status)} • {new Date(job.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedJobId && (
                <BackgroundAgentModal
                    jobId={selectedJobId}
                    onClose={() => setSelectedJobId(null)}
                />
            )}
        </>
    );
};

export default BackgroundAgentJobsList; 