import { handleAuthResponse, getPostHeaders, getDefaultHeaders } from './authUtils';

export interface BackgroundAgentJob {
    id: number;
    status: string;
    result?: string;
    error?: string;
}

export const createBackgroundAgentJob = async ({
    query,
    taskId,
    sendEmail = false,
}: {
    query: string;
    taskId?: number;
    sendEmail?: boolean;
}): Promise<BackgroundAgentJob> => {
    const response = await fetch('/api/background-agent-jobs', {
        method: 'POST',
        credentials: 'include',
        headers: getPostHeaders(),
        body: JSON.stringify({ query, taskId, sendEmail }),
    });

    await handleAuthResponse(response, 'Failed to create background agent job.');
    const data = await response.json();
    return data.job;
};

export const fetchBackgroundAgentJob = async (id: number): Promise<BackgroundAgentJob> => {
    const response = await fetch(`/api/background-agent-jobs/${id}`, {
        credentials: 'include',
        headers: getDefaultHeaders(),
    });

    await handleAuthResponse(response, 'Failed to fetch background agent job.');
    const data = await response.json();
    return data.job;
};

export const fetchBackgroundAgentJobs = async (): Promise<BackgroundAgentJob[]> => {
    const response = await fetch('/api/background-agent-jobs', {
        credentials: 'include',
        headers: getDefaultHeaders(),
    });

    await handleAuthResponse(response, 'Failed to fetch background agent jobs.');
    const data = await response.json();
    return data.jobs;
};

export const fetchBackgroundAgentJobsByTask = async (taskId: number): Promise<BackgroundAgentJob[]> => {
    const response = await fetch(`/api/background-agent-jobs?taskId=${taskId}`, {
        credentials: 'include',
        headers: getDefaultHeaders(),
    });

    await handleAuthResponse(response, 'Failed to fetch background agent jobs for task.');
    const data = await response.json();
    return data.jobs;
}; 