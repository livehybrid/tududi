const { Task, Project, User } = require('../models');
const { logError, logInfo } = require('./logService');

class MicrosoftTodoService {
    constructor() {
        this.clientId = process.env.MICROSOFT_CLIENT_ID || '';
        this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
        this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3002/auth/microsoft/callback';
        this.scope = 'https://graph.microsoft.com/Tasks.ReadWrite offline_access';
        
        // Log configuration for debugging
        console.log('[MICROSOFT SERVICE] Initialized with:');
        console.log('[MICROSOFT SERVICE] Client ID:', this.clientId);
        console.log('[MICROSOFT SERVICE] Client Secret:', this.clientSecret ? '***SET***' : 'NOT SET');
        console.log('[MICROSOFT SERVICE] Redirect URI:', this.redirectUri);
    }

    /**
     * Get Microsoft Graph API access token using authorization code
     */
    async getAccessToken(authCode) {
        try {
            if (!this.clientSecret) {
                throw new Error('Microsoft client secret is not configured. Please set MICROSOFT_CLIENT_SECRET environment variable.');
            }
            
            console.log('[MICROSOFT SERVICE] Exchanging code for tokens...');
            const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
            const params = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: authCode,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
                scope: this.scope
            });

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                throw new Error(`Token request failed: ${response.statusText}`);
            }

            const tokenData = await response.json();
            return {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                expires_at: Date.now() + (tokenData.expires_in * 1000)
            };
        } catch (error) {
            logError('Microsoft ToDo token request failed', error);
            throw error;
        }
    }

    /**
     * Refresh Microsoft Graph API access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
            const params = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                scope: this.scope
            });

            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }

            const tokenData = await response.json();
            return {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || refreshToken,
                expires_in: tokenData.expires_in,
                expires_at: Date.now() + (tokenData.expires_in * 1000)
            };
        } catch (error) {
            logError('Microsoft ToDo token refresh failed', error);
            throw error;
        }
    }

    /**
     * Get Microsoft ToDo lists
     */
    async getTodoLists(accessToken) {
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ToDo lists: ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            logError('Failed to fetch Microsoft ToDo lists', error);
            throw error;
        }
    }

    /**
     * Get tasks from a specific Microsoft ToDo list
     */
    async getTasksFromList(accessToken, listId) {
        try {
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks from list ${listId}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            logError(`Failed to fetch tasks from Microsoft ToDo list ${listId}`, error);
            throw error;
        }
    }

    /**
     * Map Microsoft ToDo task to Tududi task format
     */
    mapMicrosoftTaskToTududi(microsoftTask, projectId, userId) {
        // Map status
        let status = 0; // not_started
        if (microsoftTask.status === 'completed') status = 2; // done
        else if (microsoftTask.status === 'inProgress') status = 1; // in_progress

        // Map priority
        let priority = 1; // medium
        if (microsoftTask.importance === 'high') priority = 2; // high
        else if (microsoftTask.importance === 'low') priority = 0; // low

        return {
            name: microsoftTask.title,
            description: microsoftTask.body?.content || null,
            due_date: microsoftTask.dueDateTime?.dateTime ? new Date(microsoftTask.dueDateTime.dateTime) : null,
            priority: priority,
            status: status,
            project_id: projectId,
            user_id: userId,
            external_id: microsoftTask.id,
            external_source: 'microsoft_todo',
            external_last_modified: microsoftTask.lastModifiedDateTime
        };
    }

    /**
     * Map Tududi task to Microsoft ToDo task format
     */
    mapTududiTaskToMicrosoft(tududiTask) {
        // Map status
        let status = 'notStarted';
        if (tududiTask.status === 2) status = 'completed'; // done
        else if (tududiTask.status === 1) status = 'inProgress'; // in_progress

        // Map priority
        let importance = 'normal';
        if (tududiTask.priority === 2) importance = 'high';
        else if (tududiTask.priority === 0) importance = 'low';

        return {
            title: tududiTask.name,
            body: {
                content: tududiTask.description || '',
                contentType: 'text'
            },
            importance: importance,
            status: status,
            dueDateTime: tududiTask.due_date ? {
                dateTime: tududiTask.due_date.toISOString(),
                timeZone: 'UTC'
            } : undefined
        };
    }

    /**
     * Import tasks from Microsoft ToDo to Tududi
     */
    async importTasksFromMicrosoft(userId, accessToken) {
        try {
            logInfo(`Starting Microsoft ToDo import for user ${userId}`);

            // Get all Microsoft ToDo lists
            const lists = await this.getTodoLists(accessToken);
            logInfo(`Found ${lists.length} Microsoft ToDo lists`);

            let totalImported = 0;
            const projectMap = new Map();

            // Get existing projects for mapping
            const existingProjects = await Project.findAll({
                where: { user_id: userId },
                attributes: ['id', 'name']
            });

            existingProjects.forEach(project => {
                projectMap.set(project.name.toLowerCase(), project.id);
            });

            for (const list of lists) {
                logInfo(`Processing Microsoft ToDo list: ${list.displayName}`);

                // Find or create project for this list
                let projectId = projectMap.get(list.displayName.toLowerCase());
                
                if (!projectId) {
                    // Create new project for this list
                    const newProject = await Project.create({
                        name: list.displayName,
                        description: `Imported from Microsoft ToDo list`,
                        user_id: userId,
                        state: 'in_progress'
                    });
                    projectId = newProject.id;
                    projectMap.set(list.displayName.toLowerCase(), projectId);
                    logInfo(`Created new project: ${list.displayName}`);
                }

                // Get tasks from this list
                const tasks = await this.getTasksFromList(accessToken, list.id);
                logInfo(`Found ${tasks.length} tasks in list: ${list.displayName}`);

                const tasksToImport = [];

                for (const microsoftTask of tasks) {
                    // Check if task already exists
                    const existingTask = await Task.findOne({
                        where: {
                            user_id: userId,
                            external_id: microsoftTask.id
                        }
                    });

                    if (existingTask) {
                        // Check if task needs updating
                        const msUpdated = new Date(microsoftTask.lastModifiedDateTime);
                        const localUpdated = new Date(existingTask.updatedAt);
                        
                        if (msUpdated <= localUpdated) {
                            logInfo(`Skipping task ${microsoftTask.id} - no updates needed`);
                            continue;
                        }
                    }

                    // Map and prepare task for import
                    const tududiTask = this.mapMicrosoftTaskToTududi(microsoftTask, projectId, userId);
                    tasksToImport.push(tududiTask);
                }

                // Import tasks
                if (tasksToImport.length > 0) {
                    await Task.bulkCreate(tasksToImport, {
                        updateOnDuplicate: ['name', 'description', 'due_date', 'priority', 'status', 'external_last_modified']
                    });
                    totalImported += tasksToImport.length;
                    logInfo(`Imported ${tasksToImport.length} tasks from list: ${list.displayName}`);
                }
            }

            logInfo(`Microsoft ToDo import completed: ${totalImported} tasks imported from ${lists.length} lists`);
            return { imported: totalImported, lists: lists.length };

        } catch (error) {
            logError('Microsoft ToDo import failed', error);
            throw error;
        }
    }

    /**
     * Export tasks from Tududi to Microsoft ToDo
     */
    async exportTasksToMicrosoft(userId, accessToken) {
        try {
            logInfo(`Starting Microsoft ToDo export for user ${userId}`);

            // Get tasks that need to be exported (no external_id or recently modified)
            const tasks = await Task.findAll({
                where: {
                    user_id: userId,
                    external_source: 'microsoft_todo'
                },
                include: [{
                    model: Project,
                    as: 'project',
                    attributes: ['name']
                }]
            });

            if (tasks.length === 0) {
                logInfo('No tasks to export to Microsoft ToDo');
                return { exported: 0 };
            }

            // Get Microsoft ToDo lists
            const lists = await this.getTodoLists(accessToken);
            const listMap = new Map();
            lists.forEach(list => {
                listMap.set(list.displayName.toLowerCase(), list.id);
            });

            let exportedCount = 0;

            for (const task of tasks) {
                try {
                    // Determine target list
                    let targetListId = null;
                    let targetListName = 'Tasks'; // Default list name

                    if (task.project && task.project.name) {
                        targetListName = task.project.name;
                        targetListId = listMap.get(targetListName.toLowerCase());

                        // Create list if it doesn't exist
                        if (!targetListId) {
                            const createListResponse = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    displayName: targetListName
                                })
                            });

                            if (createListResponse.ok) {
                                const newList = await createListResponse.json();
                                targetListId = newList.id;
                                listMap.set(targetListName.toLowerCase(), targetListId);
                                logInfo(`Created new Microsoft ToDo list: ${targetListName}`);
                            }
                        }
                    }

                    // Fallback to default list
                    if (!targetListId) {
                        const defaultList = lists.find(list => list.wellknownListName === 'defaultList') || lists[0];
                        targetListId = defaultList?.id;
                    }

                    if (!targetListId) {
                        logError(`No target list found for task: ${task.name}`);
                        continue;
                    }

                    // Map task to Microsoft format
                    const microsoftTask = this.mapTududiTaskToMicrosoft(task);

                    // Create or update task in Microsoft ToDo
                    let method = 'POST';
                    let url = `https://graph.microsoft.com/v1.0/me/todo/lists/${targetListId}/tasks`;

                    if (task.external_id) {
                        method = 'PATCH';
                        url = `https://graph.microsoft.com/v1.0/me/todo/lists/${targetListId}/tasks/${task.external_id}`;
                    }

                    const response = await fetch(url, {
                        method,
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(microsoftTask)
                    });

                    if (response.ok) {
                        const createdTask = await response.json();
                        
                        // Update local task with Microsoft ID
                        await task.update({
                            external_id: createdTask.id,
                            external_source: 'microsoft_todo',
                            external_last_modified: createdTask.lastModifiedDateTime
                        });

                        exportedCount++;
                        logInfo(`Exported task: ${task.name} to list: ${targetListName}`);
                    } else {
                        logError(`Failed to export task ${task.name}: ${response.statusText}`);
                    }
                } catch (error) {
                    logError(`Error exporting task ${task.name}`, error);
                }
            }

            logInfo(`Microsoft ToDo export completed: ${exportedCount} tasks exported`);
            return { exported: exportedCount };

        } catch (error) {
            logError('Microsoft ToDo export failed', error);
            throw error;
        }
    }

    /**
     * Get Microsoft OAuth authorization URL
     */
    getAuthorizationUrl() {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: this.scope,
            response_mode: 'query',
            prompt: 'select_account'
        });

        return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    }
}

module.exports = new MicrosoftTodoService();
