import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { fetchBackgroundAgentJob, type BackgroundAgentJob } from '../../utils/backgroundAgentService';

interface BackgroundAgentModalProps {
    jobId: number;
    onClose: () => void;
}

const BackgroundAgentModal: React.FC<BackgroundAgentModalProps> = ({ jobId, onClose }) => {
    const { t } = useTranslation();
    const [job, setJob] = useState<BackgroundAgentJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const jobData = await fetchBackgroundAgentJob(jobId);
                setJob(jobData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch job');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();

        // Poll for updates if job is still pending
        const interval = setInterval(async () => {
            if (job?.status === 'pending') {
                try {
                    const jobData = await fetchBackgroundAgentJob(jobId);
                    setJob(jobData);
                    if (jobData.status !== 'pending') {
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Error polling job:', err);
                }
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [jobId, job?.status]);

    const getStatusIcon = () => {
        switch (job?.status) {
            case 'completed':
                return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
            case 'error':
                return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
            case 'pending':
                return <ClockIcon className="w-6 h-6 text-yellow-500 animate-spin" />;
            default:
                return <MagnifyingGlassIcon className="w-6 h-6 text-gray-500" />;
        }
    };

    const getStatusText = () => {
        switch (job?.status) {
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                    <div className="flex items-center justify-center">
                        <ClockIcon className="w-8 h-8 text-blue-500 animate-spin mr-3" />
                        <span className="text-lg">{t('backgroundAgent.loading', 'Loading...')}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('backgroundAgent.error', 'Error')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <MagnifyingGlassIcon className="w-6 h-6 text-purple-500 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('backgroundAgent.results', 'Background Agent Results')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {job && (
                    <div className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center space-x-2">
                            {getStatusIcon()}
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {getStatusText()}
                            </span>
                        </div>

                        {/* Query */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('backgroundAgent.query', 'Query')}
                            </h3>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <p className="text-gray-900 dark:text-gray-100">{job.query}</p>
                            </div>
                        </div>

                        {/* Result */}
                        {job.status === 'completed' && job.result && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('backgroundAgent.result', 'Result')}
                                </h3>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                    <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 text-sm">
                                        {job.result}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {job.status === 'error' && job.error && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('backgroundAgent.error', 'Error')}
                                </h3>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                    <p className="text-red-600 dark:text-red-400 text-sm">{job.error}</p>
                                </div>
                            </div>
                        )}

                        {/* Timestamps */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <p>
                                {t('backgroundAgent.created', 'Created')}: {new Date(job.created_at).toLocaleString()}
                            </p>
                            {job.updated_at !== job.created_at && (
                                <p>
                                    {t('backgroundAgent.updated', 'Updated')}: {new Date(job.updated_at).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackgroundAgentModal; 