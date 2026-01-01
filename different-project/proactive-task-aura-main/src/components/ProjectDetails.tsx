
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseProjects, useSupabaseTasks, SupabaseProject } from '@/hooks/useSupabaseData';
import { TaskList } from './TaskList';

interface ProjectDetailsProps {
  project: SupabaseProject;
  onBack: () => void;
}

export const ProjectDetails = ({ project, onBack }: ProjectDetailsProps) => {
  const { updateProject } = useSupabaseProjects();
  const { tasks } = useSupabaseTasks();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || '',
    color: project.color,
    status: project.status
  });

  const projectTasks = tasks.filter(task => task.project_id === project.id);

  const handleSave = async () => {
    await updateProject(project.id, formData);
    setIsEditOpen(false);
  };

  const colorOptions = [
    { value: '#0ea5e9', label: 'Blue' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#06b6d4', label: 'Cyan' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
            <Badge variant="secondary">{project.status}</Badge>
          </div>
          
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Project name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={formData.color} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, color: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: option.value }}
                            />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'completed' | 'archived') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          {projectTasks.length} tasks • Created {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Project Tasks */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Project Tasks</h3>
          {projectTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks in this project yet.</p>
              <Button variant="outline" className="mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projectTasks.map((task) => (
                <div key={task.id} className="glass-effect rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                    <Badge variant={task.completed ? "default" : "secondary"}>
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
