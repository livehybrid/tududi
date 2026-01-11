import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TrashIcon,
    CheckIcon,
    TagIcon,
    FolderIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Task } from '../../entities/Task';
import { Project } from '../../entities/Project';
import { Area } from '../../entities/Area';
import { Tag } from '../../entities/Tag';
import ConfirmDialog from '../Shared/ConfirmDialog';
import BulkAssignProjectDialog from './BulkAssignProjectDialog';
import BulkAssignTagsDialog from './BulkAssignTagsDialog';

interface BulkActionsToolbarProps {
    selectedTasks: Task[];
    onClose: () => void;
    onBulkClose: (taskUids: string[]) => Promise<void>;
    onBulkDelete: (taskUids: string[]) => Promise<void>;
    onBulkAssignProject: (taskUids: string[], projectId: number | null) => Promise<void>;
    onBulkAssignTags: (taskUids: string[], tags: Tag[]) => Promise<void>;
    projects: Project[];
    areas: Area[];
    tags: Tag[];
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedTasks,
    onClose,
    onBulkClose,
    onBulkDelete,
    onBulkAssignProject,
    onBulkAssignTags,
    projects,
    areas,
    tags,
}) => {
    const { t } = useTranslation();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showProjectDialog, setShowProjectDialog] = useState(false);
    const [showTagsDialog, setShowTagsDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const selectedCount = selectedTasks.length;
    const selectedUids = selectedTasks.map((t) => t.uid).filter(Boolean) as string[];

    const handleBulkClose = async () => {
        setIsProcessing(true);
        try {
            await onBulkClose(selectedUids);
            onClose();
        } catch (error) {
            console.error('Error closing tasks:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsProcessing(true);
        try {
            await onBulkDelete(selectedUids);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error('Error deleting tasks:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkAssignProject = async (projectId: number | null) => {
        setIsProcessing(true);
        try {
            await onBulkAssignProject(selectedUids, projectId);
            setShowProjectDialog(false);
            onClose();
        } catch (error) {
            console.error('Error assigning project:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkAssignTags = async (selectedTags: Tag[]) => {
        setIsProcessing(true);
        try {
            await onBulkAssignTags(selectedUids, selectedTags);
            setShowTagsDialog(false);
            onClose();
        } catch (error) {
            console.error('Error assigning tags:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (selectedCount === 0) return null;

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('tasks.selectedCount', '{{count}} selected', {
                                count: selectedCount,
                            })}
                        </span>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label={t('common.close', 'Close')}
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkClose}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckIcon className="h-4 w-4 mr-2" />
                            {t('tasks.close', 'Close')}
                        </button>
                        <button
                            onClick={() => setShowProjectDialog(true)}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FolderIcon className="h-4 w-4 mr-2" />
                            {t('tasks.assignProject', 'Assign Project')}
                        </button>
                        <button
                            onClick={() => setShowTagsDialog(true)}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TagIcon className="h-4 w-4 mr-2" />
                            {t('tasks.assignTags', 'Assign Tags')}
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isProcessing}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-md shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            {t('tasks.delete', 'Delete')}
                        </button>
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <ConfirmDialog
                    title={t('tasks.bulkDeleteTitle', 'Delete Selected Tasks')}
                    message={t(
                        'tasks.bulkDeleteMessage',
                        'Are you sure you want to delete {{count}} selected task(s)? This action cannot be undone.',
                        { count: selectedCount }
                    )}
                    onConfirm={handleBulkDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}

            {showProjectDialog && (
                <BulkAssignProjectDialog
                    selectedTasks={selectedTasks}
                    projects={projects}
                    areas={areas}
                    onAssign={handleBulkAssignProject}
                    onCancel={() => setShowProjectDialog(false)}
                />
            )}

            {showTagsDialog && (
                <BulkAssignTagsDialog
                    selectedTasks={selectedTasks}
                    tags={tags}
                    onAssign={handleBulkAssignTags}
                    onCancel={() => setShowTagsDialog(false)}
                />
            )}
        </>
    );
};

export default BulkActionsToolbar;
