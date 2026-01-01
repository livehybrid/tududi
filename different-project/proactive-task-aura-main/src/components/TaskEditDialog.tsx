
import { useState, useEffect } from 'react';
import { Edit, Trash2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseTasks, useSupabaseProjects, SupabaseTask } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskEditDialogProps {
  task: SupabaseTask | null;
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export const TaskEditDialog = ({ task, children, isOpen, onClose }: TaskEditDialogProps) => {
  const { updateTask, deleteTask } = useSupabaseTasks();
  const { projects } = useSupabaseProjects();
  const { toast } = useToast();
  const [open, setOpen] = useState(isOpen || false);
  const [loading, setLoading] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in-progress' | 'completed' | 'blocked',
    project_id: 'no-project',
    due_date: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        project_id: task.project_id || 'no-project',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
      });
    }
  }, [task]);

  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  if (!task) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date || undefined,
        project_id: formData.project_id === 'no-project' ? undefined : formData.project_id || undefined,
      };

      await updateTask(task.id, taskData);
      handleOpenChange(false);
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
        handleOpenChange(false);
        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting task:', error);
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive",
        });
      }
    }
  };

  const handleResearch = async () => {
    setResearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful research assistant. Provide concise, factual information about the user\'s request. If it\'s about current data like currency rates, stock prices, or news, mention that real-time data may vary.'
            },
            {
              role: 'user',
              content: `Research information about this task: "${task.title}". ${task.description ? `Description: ${task.description}` : ''}`
            }
          ],
          model: 'openai/gpt-4.1'
        }
      });

      if (error) throw error;

      const researchResults = data.response;
      
      // Update task description with research results
      const updatedDescription = `${formData.description}\n\n--- AI Research Results ---\n${researchResults}`;
      
      await updateTask(task.id, { description: updatedDescription });
      
      setFormData(prev => ({ ...prev, description: updatedDescription }));
      
      toast({
        title: "Research Complete",
        description: "AI research results added to task description",
      });
    } catch (error) {
      console.error('Research error:', error);
      toast({
        title: "Research Failed",
        description: "Could not complete research. Please check your OpenRouter API key in admin settings.",
        variant: "destructive",
      });
    } finally {
      setResearchLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
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
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
            />
            <div className="flex justify-between items-center mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResearch}
                disabled={researchLoading}
              >
                <Bot className="w-4 h-4 mr-2" />
                {researchLoading ? 'Researching...' : 'AI Research'}
              </Button>
            </div>
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

          <div className="flex justify-between gap-2">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Task'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
