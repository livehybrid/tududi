
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskContext } from '@/contexts/TaskContext';
import { useNotesContext } from '@/contexts/NotesContext';
import { useIdeasContext } from '@/contexts/IdeasContext';
import { useProjectsContext } from '@/contexts/ProjectsContext';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'tasks' | 'notes' | 'ideas' | 'projects';
}

export const QuickAddModal = ({ isOpen, onClose, currentView }: QuickAddModalProps) => {
  const [type, setType] = useState(currentView);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const { addTask } = useTaskContext();
  const { addNote } = useNotesContext();
  const { addIdea } = useIdeasContext();
  const { addProject } = useProjectsContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    switch (type) {
      case 'tasks':
        addTask({
          title,
          description,
          completed: false,
          priority
        });
        break;
      case 'notes':
        addNote({
          title,
          content: description,
          tags: []
        });
        break;
      case 'ideas':
        addIdea({
          title,
          description,
          status: 'inbox'
        });
        break;
      case 'projects':
        addProject({
          name: title,
          description,
          color: '#0ea5e9',
          status: 'active'
        });
        break;
    }

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass-effect rounded-lg p-6 w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quick Add</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={type} onValueChange={(value: any) => setType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">Task</SelectItem>
              <SelectItem value="notes">Note</SelectItem>
              <SelectItem value="ideas">Idea</SelectItem>
              <SelectItem value="projects">Project</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${type.slice(0, -1)} title...`}
            autoFocus
          />

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
          />

          {type === 'tasks' && (
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Create {type.slice(0, -1)}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
