
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseProjects } from '@/hooks/useSupabaseData';

export const ProjectForm = () => {
  const { addProject } = useSupabaseProjects();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0ea5e9',
    status: 'active' as 'active' | 'completed' | 'archived'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addProject(formData);
      
      setFormData({
        name: '',
        description: '',
        color: '#0ea5e9',
        status: 'active'
      });
      setOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Project name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
              <Select value={formData.color} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, color: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Color" />
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
            </div>

            <div>
              <Select value={formData.status} onValueChange={(value: 'active' | 'completed' | 'archived') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
