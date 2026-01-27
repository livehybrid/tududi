const express = require('express');
const microsoftTodoService = require('../services/microsoftTodoService');
const { logError, logInfo } = require('../services/logService');
const router = express.Router();

/**
 * GET /api/microsoft-todo/lists
 * Get Microsoft ToDo lists
 */
router.get('/lists', async (req, res) => {
    try {
        const { access_token } = req.session.microsoftTodo || {};

        if (!access_token) {
            return res
                .status(401)
                .json({ error: 'Not connected to Microsoft ToDo' });
        }

        const lists = await microsoftTodoService.getTodoLists(access_token);
        res.json({ lists });
    } catch (error) {
        logError('Failed to fetch Microsoft ToDo lists', error);
        res.status(500).json({ error: 'Failed to fetch lists' });
    }
});

/**
 * POST /api/microsoft-todo/import
 * Import tasks from Microsoft ToDo
 */
router.post('/import', async (req, res) => {
    try {
        const { access_token } = req.session.microsoftTodo || {};
        const { forceUpdate = false } = req.body;

        if (!access_token) {
            return res
                .status(401)
                .json({ error: 'Not connected to Microsoft ToDo' });
        }

        const result = await microsoftTodoService.importTasksFromMicrosoft(
            req.currentUser.id,
            access_token,
            forceUpdate
        );

        logInfo(
            `Microsoft ToDo import completed for user ${req.currentUser.id}: ${result.imported} tasks imported (forceUpdate: ${forceUpdate})`
        );
        res.json({
            success: true,
            imported: result.imported,
            lists: result.lists,
            forceUpdate: forceUpdate,
            message: `Successfully imported ${result.imported} tasks from ${result.lists} lists${forceUpdate ? ' (forced update)' : ''}`,
        });
    } catch (error) {
        logError('Failed to import from Microsoft ToDo', error);
        res.status(500).json({
            error: 'Failed to import tasks from Microsoft ToDo',
        });
    }
});

/**
 * POST /api/microsoft-todo/export
 * Export tasks to Microsoft ToDo
 */
router.post('/export', async (req, res) => {
    try {
        const { access_token } = req.session.microsoftTodo || {};

        if (!access_token) {
            return res
                .status(401)
                .json({ error: 'Not connected to Microsoft ToDo' });
        }

        const result = await microsoftTodoService.exportTasksToMicrosoft(
            req.currentUser.id,
            access_token
        );

        logInfo(
            `Microsoft ToDo export completed for user ${req.currentUser.id}: ${result.exported} tasks exported`
        );
        res.json({
            success: true,
            exported: result.exported,
            message: `Successfully exported ${result.exported} tasks to Microsoft ToDo`,
        });
    } catch (error) {
        logError('Failed to export to Microsoft ToDo', error);
        res.status(500).json({
            error: 'Failed to export tasks to Microsoft ToDo',
        });
    }
});

/**
 * POST /api/microsoft-todo/sync
 * Bidirectional sync with Microsoft ToDo
 */
router.post('/sync', async (req, res) => {
    try {
        const { access_token } = req.session.microsoftTodo || {};
        const { forceUpdate = false } = req.body;

        if (!access_token) {
            return res
                .status(401)
                .json({ error: 'Not connected to Microsoft ToDo' });
        }

        // Import first, then export
        const importResult =
            await microsoftTodoService.importTasksFromMicrosoft(
                req.currentUser.id,
                access_token,
                forceUpdate
            );
        const exportResult = await microsoftTodoService.exportTasksToMicrosoft(
            req.currentUser.id,
            access_token
        );

        logInfo(
            `Microsoft ToDo sync completed for user ${req.currentUser.id}: ${importResult.imported} imported, ${exportResult.exported} exported (forceUpdate: ${forceUpdate})`
        );
        res.json({
            success: true,
            imported: importResult.imported,
            exported: exportResult.exported,
            forceUpdate: forceUpdate,
            message: `Sync completed: ${importResult.imported} imported, ${exportResult.exported} exported${forceUpdate ? ' (forced update)' : ''}`,
        });
    } catch (error) {
        logError('Failed to sync with Microsoft ToDo', error);
        res.status(500).json({ error: 'Failed to sync with Microsoft ToDo' });
    }
});

/**
 * DELETE /api/microsoft-todo/disconnect
 * Disconnect from Microsoft ToDo
 */
router.delete('/disconnect', async (req, res) => {
    try {
        const { User } = require('../models');

        // Clear session
        delete req.session.microsoftTodo;

        // Clear database
        await User.update(
            {
                microsoft_todo_connected: false,
                microsoft_todo_access_token: null,
                microsoft_todo_refresh_token: null,
                microsoft_todo_expires_at: null,
            },
            {
                where: { id: req.currentUser.id },
            }
        );

        logInfo(`Microsoft ToDo disconnected for user ${req.currentUser.id}`);
        res.json({
            success: true,
            message: 'Disconnected from Microsoft ToDo',
        });
    } catch (error) {
        logError('Failed to disconnect from Microsoft ToDo', error);
        res.status(500).json({
            error: 'Failed to disconnect from Microsoft ToDo',
        });
    }
});

module.exports = router;
