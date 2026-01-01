
import { useState, useEffect } from 'react';
import { Plus, Search, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSupabaseProjects, useSupabaseTasks, SupabaseProject } from '@/hooks/useSupabaseData';
import { ProjectDetails } from './ProjectDetails';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export const ProjectsList = () => {
  const { projects, fetchProjects } = useSupabaseProjects();
  const { tasks } = useSupabaseTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<SupabaseProject | null>(null);

  // Set up real-time subscription for projects
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes-projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Real-time project update:', payload);
          fetchProjects(); // Refetch projects when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProjectTaskCount = (projectId: string) => {
    return tasks.filter(task => task.project_id === projectId).length;
  };

  // If a project is selected, show project details
  if (selectedProject) {
    return (
      <ProjectDetails 
        project={selectedProject} 
        onBack={() => setSelectedProject(null)} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-muted-foreground">{filteredProjects.length} active projects</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Folder className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-muted-foreground">Create your first project to organize your work</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="glass-effect rounded-lg p-4 hover-lift cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className="font-medium flex-1">{project.name}</h3>
                    <Badge variant="secondary">
                      {project.status}
                    </Badge>
                  </div>
                  
                  {project.description && (
                    <p className="text-muted-foreground text-sm mb-3">{project.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getProjectTaskCount(project.id)} tasks</span>
                    <span>Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
