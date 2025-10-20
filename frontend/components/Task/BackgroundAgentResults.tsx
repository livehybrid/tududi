import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { fetchBackgroundAgentJobsByTask } from '../../utils/backgroundAgentService';
import BackgroundAgentModal from '../BackgroundAgent/BackgroundAgentModal';

interface BackgroundAgentJob {
    id: number;
    status: string;
    result?: string;
    error?: string;
    query: string;
    created_at: string;
    updated_at: string;
}

interface BackgroundAgentResultsProps {
    taskId: number;
    isSubtask?: boolean;
}

const BackgroundAgentResults: React.FC<BackgroundAgentResultsProps> = ({ taskId, isSubtask = false }) => {
    const { t } = useTranslation();
    const [jobs, setJobs] = useState<BackgroundAgentJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

    useEffect(() => {
        const loadJobs = async () => {
            try {
                const jobsData = await fetchBackgroundAgentJobsByTask(taskId);
                setJobs(jobsData);
            } catch (error) {
                console.error('Failed to load background agent jobs:', error);
            } finally {
                setLoading(false);
            }
        };

        loadJobs();
    }, [taskId]);

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
            <div className="flex items-center justify-center py-4">
                <ClockIcon className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('backgroundAgent.loading', 'Loading...')}
                </span>
            </div>
        );
    }

    if (jobs.length === 0) {
        return null; // Don't show anything if no jobs
    }

    return (
        <>
            <div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-purple-500" />
                    {isSubtask 
                        ? t('task.subtaskBackgroundAgentResults', 'Subtask Background Agent Results')
                        : t('task.backgroundAgentResults', 'Background Agent Results')
                    }
                </h4>
                <div className="space-y-3">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="rounded-lg shadow-sm bg-white dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setSelectedJobId(job.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-2">
                                        {getStatusIcon(job.status)}
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {getStatusText(job.status)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(job.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        <strong>Query:</strong> {job.query}
                                    </div>

                                    {job.status === 'completed' && job.result && (
                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                <strong>Result:</strong>
                                            </div>
                                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-3">
                                                {job.result}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                Click to view full result
                                            </div>
                                        </div>
                                    )}

                                    {job.status === 'error' && job.error && (
                                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                            <div className="text-sm text-red-600 dark:text-red-400">
                                                <strong>Error:</strong> {job.error}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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

export default BackgroundAgentResults; 