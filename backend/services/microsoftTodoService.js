const { Task, Project, User, TaskEvent } = require('../models');
const { Op } = require('sequelize');
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
        // Debug: Log all available Microsoft task fields
        logInfo(`[DEBUG] Microsoft Task Fields for "${microsoftTask.title}":`, {
            id: microsoftTask.id,
            title: microsoftTask.title,
            body: microsoftTask.body,
            status: microsoftTask.status,
            importance: microsoftTask.importance,
            dueDateTime: microsoftTask.dueDateTime,
            createdDateTime: microsoftTask.createdDateTime,
            lastModifiedDateTime: microsoftTask.lastModifiedDateTime,
            completedDateTime: microsoftTask.completedDateTime,
            reminderDateTime: microsoftTask.reminderDateTime,
            categories: microsoftTask.categories,
            hasAttachments: microsoftTask.hasAttachments,
            isReminderOn: microsoftTask.isReminderOn,
            allFields: Object.keys(microsoftTask)
        });

        // Map status
        let status = 0; // not_started
        if (microsoftTask.status === 'completed') status = 2; // done
        else if (microsoftTask.status === 'inProgress') status = 1; // in_progress

        // Map priority
        let priority = 1; // medium
        if (microsoftTask.importance === 'high') priority = 2; // high
        else if (microsoftTask.importance === 'low') priority = 0; // low

        // Extract description from body content
        let description = null;
        if (microsoftTask.body?.content) {
            // Remove HTML tags if present
            description = microsoftTask.body.content.replace(/<[^>]*>/g, '').trim();
        }

        const mappedTask = {
            name: microsoftTask.title,
            note: description, // Map to note field (description column was removed)
            due_date: microsoftTask.dueDateTime?.dateTime ? new Date(microsoftTask.dueDateTime.dateTime) : null,
            priority: priority,
            status: status,
            project_id: projectId,
            user_id: userId,
            external_id: microsoftTask.id,
            external_source: 'microsoft_todo',
            external_last_modified: microsoftTask.lastModifiedDateTime,
            // Map completion date if completed
            completed_at: microsoftTask.completedDateTime?.dateTime ? new Date(microsoftTask.completedDateTime.dateTime) : null,
        };

        logInfo(`[DEBUG] Mapped Tududi Task:`, mappedTask);
        return mappedTask;
    }

    /**
     * Map Tududi task to Microsoft ToDo task format
     */
    mapTududiTaskToMicrosoft(tududiTask) {
        // Debug: Log all available Tududi task fields
        logInfo(`[DEBUG] Tududi Task Fields for "${tududiTask.name}":`, {
            id: tududiTask.id,
            uid: tududiTask.uid,
            name: tududiTask.name,
            note: tududiTask.note,
            status: tududiTask.status,
            priority: tududiTask.priority,
            due_date: tududiTask.due_date,
            completed_at: tududiTask.completed_at,
            project_id: tududiTask.project_id,
            external_id: tududiTask.external_id,
            external_source: tududiTask.external_source,
            external_last_modified: tududiTask.external_last_modified,
            created_at: (tududiTask.created_at && tududiTask.created_at !== 'Invalid Date') ? tududiTask.created_at.toISOString() : 'NULL',
            updated_at: (tududiTask.updated_at && tududiTask.updated_at !== 'Invalid Date') ? tududiTask.updated_at.toISOString() : 'NULL',
            allFields: Object.keys(tududiTask)
        });

        // Map status
        let status = 'notStarted';
        if (tududiTask.status === 2) status = 'completed'; // done
        else if (tududiTask.status === 1) status = 'inProgress'; // in_progress

        // Map priority
        let importance = 'normal';
        if (tududiTask.priority === 2) importance = 'high';
        else if (tududiTask.priority === 0) importance = 'low';

        // Use note field for content (description column was removed)
        const content = tududiTask.note || '';

        // Build Microsoft task object
        const microsoftTask = {
            title: tududiTask.name,
            body: {
                content: content,
                contentType: 'text'
            },
            importance: importance,
            status: status
        };

        // Add due date if available
        if (tududiTask.due_date) {
            microsoftTask.dueDateTime = {
                dateTime: tududiTask.due_date.toISOString(),
                timeZone: 'UTC'
            };
        }

        // Note: Tududi doesn't have reminder_date or tags fields in the current model
        // These would need to be added to the Task model if we want to support them

        // Add completion date if completed
        if (tududiTask.status === 2 && tududiTask.completed_at) {
            microsoftTask.completedDateTime = {
                dateTime: tududiTask.completed_at.toISOString(),
                timeZone: 'UTC'
            };
        }

        logInfo(`[DEBUG] Mapped Microsoft Task:`, microsoftTask);
        return microsoftTask;
    }

    /**
     * Import tasks from Microsoft ToDo to Tududi
     */
    async importTasksFromMicrosoft(userId, accessToken, forceUpdate = false) {
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
                        status: 'in_progress'
                    });
                    projectId = newProject.id;
                    projectMap.set(list.displayName.toLowerCase(), projectId);
                    logInfo(`Created new project: ${list.displayName}`);
                }

                // Get tasks from this list
                const tasks = await this.getTasksFromList(accessToken, list.id);
                logInfo(`Found ${tasks.length} tasks in list: ${list.displayName}`);

                const tasksToCreate = [];
                const tasksToUpdate = [];

                for (const microsoftTask of tasks) {
                    // Check if task already exists
                    const existingTask = await Task.findOne({
                        where: {
                            user_id: userId,
                            external_id: microsoftTask.id
                        },
                        attributes: [
                            'id', 'uid', 'name', 'note', 'due_date', 'priority', 'status', 
                            'completed_at', 'external_id', 'external_source', 'external_last_modified',
                            'created_at', 'updated_at'  // Explicitly include timestamp fields
                        ]
                    });

                    if (existingTask) {
                        // Map Microsoft task to Tududi format first
                        const updatedTaskData = this.mapMicrosoftTaskToTududi(microsoftTask, projectId, userId);
                        
                        // Check if task needs updating by comparing content, not just timestamps
                        const hasContentChanges = (
                            existingTask.name !== updatedTaskData.name ||
                            existingTask.note !== updatedTaskData.note ||
                            existingTask.due_date?.getTime() !== updatedTaskData.due_date?.getTime() ||
                            existingTask.priority !== updatedTaskData.priority ||
                            existingTask.status !== updatedTaskData.status ||
                            existingTask.completed_at?.getTime() !== updatedTaskData.completed_at?.getTime()
                        );
                        
                        // Also check timestamp comparison for debugging
                        const msUpdated = new Date(microsoftTask.lastModifiedDateTime);
                        // Use updated_at if available, otherwise fall back to external_last_modified
                        const localUpdated = (existingTask.updated_at && existingTask.updated_at !== 'Invalid Date') ? 
                            new Date(existingTask.updated_at) : 
                            (existingTask.external_last_modified ? new Date(existingTask.external_last_modified) : null);
                        const isMsNewer = localUpdated ? msUpdated > localUpdated : true; // If no local timestamp, assume MS is newer
                        
                        logInfo(`[DEBUG] Task "${microsoftTask.title}" update check:`, {
                            hasContentChanges,
                            isMsNewer,
                            msUpdated: msUpdated.toISOString(),
                            localUpdated: localUpdated ? localUpdated.toISOString() : 'NULL',
                            localCreatedAt: (existingTask.created_at && existingTask.created_at !== 'Invalid Date') ? existingTask.created_at.toISOString() : 'NULL',
                            localUpdatedAt: (existingTask.updated_at && existingTask.updated_at !== 'Invalid Date') ? existingTask.updated_at.toISOString() : 'NULL',
                            localExternalLastModified: existingTask.external_last_modified ? existingTask.external_last_modified.toISOString() : 'NULL',
                            timestampSource: (existingTask.updated_at && existingTask.updated_at !== 'Invalid Date') ? 'updated_at' : (existingTask.external_last_modified ? 'external_last_modified' : 'none'),
                            existingName: existingTask.name,
                            newName: updatedTaskData.name,
                            existingNote: existingTask.note,
                            newNote: updatedTaskData.note,
                            allExistingTaskFields: Object.keys(existingTask)
                        });
                        
                        if (hasContentChanges || isMsNewer || forceUpdate) {
                            // Update local task - either content changed, Microsoft is newer, or force update
                            logInfo(`[DEBUG] Updating task "${microsoftTask.title}" - Content changes: ${hasContentChanges}, MS newer: ${isMsNewer}, Force update: ${forceUpdate}`);
                            
                            // Track changes for timeline events
                            const changes = [];
                            if (existingTask.name !== updatedTaskData.name) {
                                changes.push({ field: 'name', old: existingTask.name, new: updatedTaskData.name });
                            }
                            if (existingTask.note !== updatedTaskData.note) {
                                changes.push({ field: 'note', old: existingTask.note, new: updatedTaskData.note });
                            }
                            if (existingTask.due_date?.getTime() !== updatedTaskData.due_date?.getTime()) {
                                changes.push({ field: 'due_date', old: existingTask.due_date, new: updatedTaskData.due_date });
                            }
                            if (existingTask.priority !== updatedTaskData.priority) {
                                changes.push({ field: 'priority', old: existingTask.priority, new: updatedTaskData.priority });
                            }
                            if (existingTask.status !== updatedTaskData.status) {
                                changes.push({ field: 'status', old: existingTask.status, new: updatedTaskData.status });
                            }
                            if (existingTask.completed_at?.getTime() !== updatedTaskData.completed_at?.getTime()) {
                                changes.push({ field: 'completed_at', old: existingTask.completed_at, new: updatedTaskData.completed_at });
                            }
                            
                            await existingTask.update({
                                name: updatedTaskData.name,
                                note: updatedTaskData.note,
                                due_date: updatedTaskData.due_date,
                                priority: updatedTaskData.priority,
                                status: updatedTaskData.status,
                                completed_at: updatedTaskData.completed_at,
                                external_last_modified: microsoftTask.lastModifiedDateTime
                            });
                            
                            // Create timeline events for changes
                            for (const change of changes) {
                                await TaskEvent.createFieldChangeEvent(
                                    existingTask.id,
                                    userId,
                                    change.field,
                                    change.old,
                                    change.new,
                                    {
                                        source: 'microsoft_todo',
                                        action: 'import_update',
                                        external_id: microsoftTask.id,
                                        list_name: list.displayName
                                    }
                                );
                            }
                            
                            tasksToUpdate.push(microsoftTask.id);
                            logInfo(`Updated existing task from Microsoft: ${microsoftTask.title}`);
                        } else {
                            // No content changes and Microsoft is not newer
                            if (localUpdated && localUpdated > msUpdated) {
                                // Local is newer - mark for export to Microsoft
                                logInfo(`Local task is newer, will update Microsoft: ${existingTask.name}`);
                                tasksToUpdate.push(microsoftTask.id);
                            } else {
                                logInfo(`Skipping task ${microsoftTask.title} - no updates needed (timestamps equal and no content changes)`);
                            }
                        }
                    } else {
                        // Create new task
                        const tududiTask = this.mapMicrosoftTaskToTududi(microsoftTask, projectId, userId);
                        tasksToCreate.push(tududiTask);
                    }
                }

                // Create new tasks
                if (tasksToCreate.length > 0) {
                    const createdTasks = await Task.bulkCreate(tasksToCreate);
                    totalImported += tasksToCreate.length;
                    logInfo(`Created ${tasksToCreate.length} new tasks from list: ${list.displayName}`);
                    
                    // Create timeline events for new tasks
                    for (let i = 0; i < createdTasks.length; i++) {
                        const task = createdTasks[i];
                        const taskData = tasksToCreate[i];
                        await TaskEvent.createTaskCreatedEvent(
                            task.id,
                            userId,
                            {
                                name: taskData.name,
                                note: taskData.note,
                                due_date: taskData.due_date,
                                priority: taskData.priority,
                                status: taskData.status,
                                project_id: taskData.project_id
                            },
                            {
                                source: 'microsoft_todo',
                                action: 'import',
                                external_id: taskData.external_id,
                                list_name: list.displayName
                            }
                        );
                    }
                }

                // Count updated tasks
                if (tasksToUpdate.length > 0) {
                    totalImported += tasksToUpdate.length;
                    logInfo(`Updated ${tasksToUpdate.length} existing tasks from list: ${list.displayName}`);
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
                    [Op.or]: [
                        { external_source: 'microsoft_todo' },
                        { external_id: { [Op.ne]: null } }
                    ]
                },
                include: [{
                    model: Project,
                    as: 'Project',
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
                    // Check if task needs to be updated in Microsoft
                    if (task.external_id && task.external_last_modified) {
                        const localUpdated = new Date(task.updated_at);
                        const externalUpdated = new Date(task.external_last_modified);
                        
                        // Skip if local task is not newer than external
                        if (localUpdated <= externalUpdated) {
                            logInfo(`Skipping task ${task.name} - no local updates since last sync`);
                            continue;
                        }
                    }
                    
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

                        // Create timeline event for export
                        await TaskEvent.createFieldChangeEvent(
                            task.id,
                            userId,
                            'external_id',
                            task.external_id,
                            createdTask.id,
                            {
                                source: 'microsoft_todo',
                                action: 'export',
                                external_id: createdTask.id,
                                list_name: targetListName
                            }
                        );

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
     * Refresh Microsoft access token
     */
    async refreshAccessToken(refreshToken) {
        try {
            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                    scope: this.scope
                })
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }

            const tokenData = await response.json();
            
            return {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || refreshToken,
                expires_at: new Date(Date.now() + (tokenData.expires_in * 1000))
            };
        } catch (error) {
            logError('Failed to refresh Microsoft access token', error);
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
