import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from './Shared/ToastContext';

interface MicrosoftTodoImportProps {
    onImportComplete?: (importedCount: number) => void;
}

const MicrosoftTodoImport: React.FC<MicrosoftTodoImportProps> = ({ onImportComplete }) => {
    const { t } = useTranslation();
    const { showSuccessToast, showErrorToast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [importStats, setImportStats] = useState<{
        imported: number;
        exported: number;
        lists: number;
    } | null>(null);

    // Check connection status on component mount
    useEffect(() => {
        checkConnectionStatus();
    }, []);

    const checkConnectionStatus = async () => {
        try {
            console.log('[MicrosoftTodoImport] Checking connection status...');
            const response = await fetch('/api/microsoft-todo/status');
            console.log('[MicrosoftTodoImport] Status response:', response.status, response.statusText);
            const data = await response.json();
            console.log('[MicrosoftTodoImport] Status data:', data);
            setIsConnected(data.connected);
        } catch (error) {
            console.error('[MicrosoftTodoImport] Failed to check Microsoft ToDo status:', error);
        }
    };

    const connectToMicrosoft = async () => {
        setIsConnecting(true);
        try {
            console.log('[MicrosoftTodoImport] Getting authorization URL...');
            // Get authorization URL
            const response = await fetch('/api/microsoft-todo/auth-url');
            console.log('[MicrosoftTodoImport] Auth URL response:', response.status, response.statusText);
            const data = await response.json();
            console.log('[MicrosoftTodoImport] Auth URL data:', data);
            
            if (data.authUrl) {
                // Store the current intent in localStorage
                localStorage.setItem('microsoftAuthIntent', 'todo-import');
                
                // Redirect to Microsoft OAuth
                window.location.href = data.authUrl;
            } else {
                throw new Error('Failed to get authorization URL');
            }
        } catch (error) {
            console.error('[MicrosoftTodoImport] Microsoft connection error:', error);
            showErrorToast(t('microsoft_todo.connection_failed', 'Failed to connect to Microsoft ToDo. Please try again.'));
        } finally {
            setIsConnecting(false);
        }
    };

    const handleAuthCallback = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const authIntent = localStorage.getItem('microsoftAuthIntent');

        if (code && authIntent === 'todo-import') {
            try {
                const response = await fetch('/api/microsoft-todo/exchange-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }),
                });

                const data = await response.json();
                
                if (data.success) {
                    setIsConnected(true);
                    showSuccessToast(t('microsoft_todo.connected', 'Successfully connected to Microsoft ToDo!'));
                    
                    // Clean up URL and localStorage
                    window.history.replaceState({}, document.title, window.location.pathname);
                    localStorage.removeItem('microsoftAuthIntent');
                } else {
                    throw new Error(data.error || 'Failed to connect');
                }
            } catch (error) {
                console.error('Token exchange error:', error);
                showErrorToast(t('microsoft_todo.connection_failed', 'Failed to connect to Microsoft ToDo. Please try again.'));
            }
        }
    };

    // Handle auth callback on component mount
    useEffect(() => {
        handleAuthCallback();
    }, []);

    const importTasks = async () => {
        setIsImporting(true);
        try {
            const response = await fetch('/api/microsoft-todo/import', {
                method: 'POST',
            });

            const data = await response.json();
            
            if (data.success) {
                setImportStats({
                    imported: data.imported,
                    exported: 0,
                    lists: data.lists
                });
                setLastSync(new Date());
                showSuccessToast(
                    t('microsoft_todo.import_success', `Successfully imported ${data.imported} tasks from ${data.lists} lists!`)
                );
                onImportComplete?.(data.imported);
            } else {
                throw new Error(data.error || 'Import failed');
            }
        } catch (error) {
            console.error('Import error:', error);
            showErrorToast(t('microsoft_todo.import_failed', 'Failed to import tasks from Microsoft ToDo.'));
        } finally {
            setIsImporting(false);
        }
    };

    const exportTasks = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/microsoft-todo/export', {
                method: 'POST',
            });

            const data = await response.json();
            
            if (data.success) {
                setImportStats(prev => prev ? { ...prev, exported: data.exported } : { imported: 0, exported: data.exported, lists: 0 });
                setLastSync(new Date());
                showSuccessToast(
                    t('microsoft_todo.export_success', `Successfully exported ${data.exported} tasks to Microsoft ToDo!`)
                );
            } else {
                throw new Error(data.error || 'Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            showErrorToast(t('microsoft_todo.export_failed', 'Failed to export tasks to Microsoft ToDo.'));
        } finally {
            setIsExporting(false);
        }
    };

    const syncTasks = async () => {
        setIsSyncing(true);
        try {
            const response = await fetch('/api/microsoft-todo/sync', {
                method: 'POST',
            });

            const data = await response.json();
            
            if (data.success) {
                setImportStats({
                    imported: data.imported,
                    exported: data.exported,
                    lists: 0
                });
                setLastSync(new Date());
                showSuccessToast(
                    t('microsoft_todo.sync_success', `Sync completed: ${data.imported} imported, ${data.exported} exported!`)
                );
                onImportComplete?.(data.imported);
            } else {
                throw new Error(data.error || 'Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            showErrorToast(t('microsoft_todo.sync_failed', 'Failed to sync with Microsoft ToDo.'));
        } finally {
            setIsSyncing(false);
        }
    };

    const disconnect = async () => {
        try {
            const response = await fetch('/api/microsoft-todo/disconnect', {
                method: 'DELETE',
            });

            const data = await response.json();
            
            if (data.success) {
                setIsConnected(false);
                setImportStats(null);
                setLastSync(null);
                showSuccessToast(t('microsoft_todo.disconnected', 'Disconnected from Microsoft ToDo.'));
            } else {
                throw new Error(data.error || 'Disconnect failed');
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            showErrorToast(t('microsoft_todo.disconnect_failed', 'Failed to disconnect from Microsoft ToDo.'));
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">M</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('microsoft_todo.title', 'Microsoft ToDo Integration')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('microsoft_todo.description', 'Import and sync tasks with Microsoft ToDo')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {isConnected ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {t('microsoft_todo.connected', 'Connected')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {t('microsoft_todo.not_connected', 'Not Connected')}
                        </span>
                    )}
                </div>
            </div>

            {!isConnected ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {t('microsoft_todo.connect_title', 'Connect to Microsoft ToDo')}
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {t('microsoft_todo.connect_description', 'Connect your Microsoft account to import and sync tasks between Tududi and Microsoft ToDo.')}
                    </p>
                    <button
                        onClick={connectToMicrosoft}
                        disabled={isConnecting}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isConnecting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('microsoft_todo.connecting', 'Connecting...')}
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {t('microsoft_todo.connect_button', 'Connect to Microsoft ToDo')}
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Sync Stats */}
                    {importStats && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                                {t('microsoft_todo.last_sync', 'Last Sync Results')}
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {importStats.imported}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('microsoft_todo.imported', 'Imported')}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {importStats.exported}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('microsoft_todo.exported', 'Exported')}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {importStats.lists}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('microsoft_todo.lists', 'Lists')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Last Sync Time */}
                    {lastSync && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('microsoft_todo.last_sync_time', 'Last sync:')} {lastSync.toLocaleString()}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={importTasks}
                            disabled={isImporting || isSyncing}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('microsoft_todo.importing', 'Importing...')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                    {t('microsoft_todo.import_button', 'Import Tasks')}
                                </>
                            )}
                        </button>

                        <button
                            onClick={exportTasks}
                            disabled={isExporting || isSyncing}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('microsoft_todo.exporting', 'Exporting...')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {t('microsoft_todo.export_button', 'Export Tasks')}
                                </>
                            )}
                        </button>

                        <button
                            onClick={syncTasks}
                            disabled={isImporting || isExporting || isSyncing}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSyncing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('microsoft_todo.syncing', 'Syncing...')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {t('microsoft_todo.sync_button', 'Two-way Sync')}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Disconnect Button */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={disconnect}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {t('microsoft_todo.disconnect_button', 'Disconnect')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MicrosoftTodoImport;
