
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseTasks, useSupabaseProjects } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

export const TaskForm = () => {
  const { addTask } = useSupabaseTasks();
  const { projects } = useSupabaseProjects();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in-progress' | 'completed' | 'blocked',
    project_id: '',
    due_date: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call categorization function
      const { data: categoryData } = await supabase.functions.invoke('categorize-task', {
        body: {
          title: formData.title,
          description: formData.description,
          projects: projects
        }
      });

      const taskData = {
        ...formData,
        category: categoryData?.category || null,
        due_date: formData.due_date || undefined,
        project_id: formData.project_id === 'no-project' ? undefined : formData.project_id || undefined,
        completed: false,
        links: []
      };

      await addTask(taskData);
      
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        project_id: '',
        due_date: ''
      });
      setOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={formData.status} onValueChange={(value: 'todo' | 'in-progress' | 'completed' | 'blocked') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Select value={formData.project_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, project_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-project">No Project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
