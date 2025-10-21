import { handleAuthResponse, getPostHeaders, getDefaultHeaders } from './authUtils';

export interface ResearchJob {
    id: number;
    status: string;
    result?: string;
    error?: string;
}

export const createResearchJob = async ({
    query,
    taskId,
    sendEmail = false,
}: {
    query: string;
    taskId?: number;
    sendEmail?: boolean;
}): Promise<ResearchJob> => {
    const response = await fetch('/api/research-jobs', {
        method: 'POST',
        credentials: 'include',
        headers: getPostHeaders(),
        body: JSON.stringify({ query, taskId, sendEmail }),
    });

    await handleAuthResponse(response, 'Failed to create research job.');
    const data = await response.json();
    return data.job;
};

export const fetchResearchJob = async (id: number): Promise<ResearchJob> => {
    const response = await fetch(`/api/research-jobs/${id}`, {
        credentials: 'include',
        headers: getDefaultHeaders(),
    });

    await handleAuthResponse(response, 'Failed to fetch research job.');
    const data = await response.json();
    return data.job;
};

