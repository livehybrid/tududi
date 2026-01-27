import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Task } from '../../entities/Task';
import { Project } from '../../entities/Project';
import { Area } from '../../entities/Area';
import ProjectDropdown from '../Shared/ProjectDropdown';
import { createProject } from '../../utils/projectsService';
import { useToast } from '../Shared/ToastContext';

interface BulkAssignProjectDialogProps {
    selectedTasks: Task[];
    projects: Project[];
    areas: Area[];
    onAssign: (projectId: number | null) => Promise<void>;
    onCancel: () => void;
}

const BulkAssignProjectDialog: React.FC<BulkAssignProjectDialogProps> = ({
    selectedTasks,
    projects,
    areas,
    onAssign,
    onCancel,
}) => {
    const { t } = useTranslation();
    const { showSuccessToast, showErrorToast } = useToast();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedAreaId, setSelectedAreaId] = useState<number | null | 'all'>('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const projectDropdownRef = useRef<HTMLDivElement>(null);

    // Filter projects by selected area
    const memoizedFilteredProjects = useMemo(() => {
        if (selectedAreaId === 'all' || selectedAreaId === null) {
            return projects;
        }
        return projects.filter((p) => p.area_id === selectedAreaId);
    }, [projects, selectedAreaId]);

    useEffect(() => {
        setFilteredProjects(memoizedFilteredProjects);
    }, [memoizedFilteredProjects]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                projectDropdownOpen &&
                projectDropdownRef.current &&
                !projectDropdownRef.current.contains(e.target as Node)
            ) {
                setProjectDropdownOpen(false);
                setProjectName('');
            }
        };

        if (projectDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [projectDropdownOpen]);

    const handleProjectSearch = (query: string) => {
        setProjectName(query);
        const filtered = memoizedFilteredProjects.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredProjects(filtered);
    };

    const handleProjectSelection = (project: Project) => {
        setSelectedProject(project);
        setProjectDropdownOpen(false);
        setProjectName('');
    };

    const handleCreateProject = async (name: string) => {
        if (name.trim() !== '') {
            setIsCreatingProject(true);
            try {
                const areaId = selectedAreaId !== 'all' && selectedAreaId !== null ? selectedAreaId : undefined;
                const newProject = await createProject({ 
                    name: name.trim(),
                    area_id: areaId,
                    status: 'planned'
                });
                setSelectedProject(newProject);
                setFilteredProjects([...filteredProjects, newProject]);
                setProjectDropdownOpen(false);
                setProjectName('');
                showSuccessToast(t('success.projectCreated', 'Project created successfully'));
            } catch (error) {
                showErrorToast(t('errors.projectCreationFailed', 'Failed to create project'));
                console.error('Error creating project:', error);
            } finally {
                setIsCreatingProject(false);
            }
        }
    };

    const handleShowAllProjects = () => {
        setProjectName('');
        setFilteredProjects(memoizedFilteredProjects);
        setProjectDropdownOpen(!projectDropdownOpen);
    };

    const handleClearProject = () => {
        setSelectedProject(null);
        setProjectName('');
    };

    const handleAssign = async () => {
        setIsProcessing(true);
        try {
            const projectId = selectedProject ? selectedProject.id : null;
            await onAssign(projectId);
        } catch (error) {
            console.error('Error assigning project:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {t('tasks.assignProjectToTasks', 'Assign Project to Tasks')}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {t('tasks.selectedTasksCount', '{{count}} task(s) selected', {
                                count: selectedTasks.length,
                            })}
                        </p>
                    </div>

                    {/* Area filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('tasks.filterByArea', 'Filter by Area')}
                        </label>
                        <select
                            value={selectedAreaId === null ? 'all' : selectedAreaId}
                            onChange={(e) =>
                                setSelectedAreaId(
                                    e.target.value === 'all' ? 'all' : Number(e.target.value)
                                )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">{t('tasks.allAreas', 'All Areas')}</option>
                            {areas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Project selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('tasks.selectProject', 'Select Project')}
                        </label>
                        <div ref={projectDropdownRef} className="relative">
                            <ProjectDropdown
                                projectName={projectName}
                                onProjectSearch={handleProjectSearch}
                                dropdownOpen={projectDropdownOpen}
                                filteredProjects={filteredProjects}
                                onProjectSelection={handleProjectSelection}
                                onCreateProject={handleCreateProject}
                                isCreatingProject={isCreatingProject}
                                onShowAllProjects={handleShowAllProjects}
                                allProjects={memoizedFilteredProjects}
                                selectedProject={selectedProject}
                                onClearProject={handleClearProject}
                                placeholder={t('tasks.searchOrCreateProject', 'Search or create project...')}
                            />
                        </div>
                        {selectedProject && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {t('tasks.selectedProject', 'Selected: {{name}}', {
                                    name: selectedProject.name,
                                })}
                            </p>
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
                        disabled={isProcessing || isCreatingProject}
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

export default BulkAssignProjectDialog;
