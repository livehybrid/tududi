import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, TagIcon } from '@heroicons/react/24/outline';
import { Task } from '../../entities/Task';
import { Tag } from '../../entities/Tag';

interface BulkAssignTagsDialogProps {
    selectedTasks: Task[];
    tags: Tag[];
    onAssign: (tags: Tag[]) => Promise<void>;
    onCancel: () => void;
}

const BulkAssignTagsDialog: React.FC<BulkAssignTagsDialogProps> = ({
    selectedTasks,
    tags,
    onAssign,
    onCancel,
}) => {
    const { t } = useTranslation();
    const [selectedTagUids, setSelectedTagUids] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Get all unique tags from selected tasks
    const existingTagUids = useMemo(() => {
        const tagSet = new Set<string>();
        selectedTasks.forEach((task) => {
            task.tags?.forEach((tag) => {
                if (tag.uid) tagSet.add(tag.uid);
            });
        });
        return tagSet;
    }, [selectedTasks]);

    // Filter tags by search query
    const filteredTags = useMemo(() => {
        if (!searchQuery.trim()) return tags;
        const query = searchQuery.toLowerCase();
        return tags.filter((tag) => tag.name.toLowerCase().includes(query));
    }, [tags, searchQuery]);

    const toggleTag = (tagUid: string) => {
        setSelectedTagUids((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(tagUid)) {
                newSet.delete(tagUid);
            } else {
                newSet.add(tagUid);
            }
            return newSet;
        });
    };

    const handleAssign = async () => {
        setIsProcessing(true);
        try {
            const selectedTags = tags.filter((tag) => tag.uid && selectedTagUids.has(tag.uid));
            await onAssign(selectedTags);
        } catch (error) {
            console.error('Error assigning tags:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {t('tasks.assignTagsToTasks', 'Assign Tags to Tasks')}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {t('tasks.selectedTasksCount', '{{count}} task(s) selected', {
                                count: selectedTasks.length,
                            })}
                        </p>
                        <input
                            type="text"
                            placeholder={t('tasks.searchTags', 'Search tags...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        {filteredTags.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                {searchQuery
                                    ? t('tasks.noTagsFound', 'No tags found')
                                    : t('tasks.noTagsAvailable', 'No tags available')}
                            </p>
                        ) : (
                            filteredTags.map((tag) => {
                                const isSelected = tag.uid ? selectedTagUids.has(tag.uid) : false;
                                const isExisting = tag.uid ? existingTagUids.has(tag.uid) : false;
                                return (
                                    <button
                                        key={tag.uid || tag.name}
                                        onClick={() => tag.uid && toggleTag(tag.uid)}
                                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors flex items-center gap-2 ${
                                            isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <TagIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                            {tag.name}
                                        </span>
                                        {isExisting && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {t('tasks.existing', 'existing')}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isProcessing
                            ? t('common.processing', 'Processing...')
                            : t('common.assign', 'Assign')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkAssignTagsDialog;
