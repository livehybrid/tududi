
import { useState, useEffect } from 'react';
import { Check, Plus, Calendar, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSupabaseTasks, SupabaseTask } from '@/hooks/useSupabaseData';
import { TaskEditDialog } from './TaskEditDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TaskListProps {
  showCompleted: boolean;
  onToggleCompleted: () => void;
}

export const TaskList = ({ showCompleted, onToggleCompleted }: TaskListProps) => {
  const { tasks, updateTask, fetchTasks } = useSupabaseTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<SupabaseTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Set up real-time subscription for tasks
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Real-time task update:', payload);
          fetchTasks(); // Refetch tasks when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    // Fix: Properly filter by completion status
    const matchesCompleted = showCompleted ? task.completed === true : task.completed === false;
    return matchesSearch && matchesCompleted;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300';
      case 'in-progress': return 'bg-blue-500/20 text-blue-300';
      case 'blocked': return 'bg-red-500/20 text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleTaskClick = (task: SupabaseTask) => {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  };

  const handleToggleComplete = async (e: React.MouseEvent, task: SupabaseTask) => {
    e.stopPropagation();
    const newCompleted = !task.completed;
    await updateTask(task.id, { 
      completed: newCompleted,
      status: newCompleted ? 'completed' : 'todo'
    });
    // Force refetch to ensure UI updates
    fetchTasks();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="text-muted-foreground">
              {filteredTasks.length} {showCompleted ? 'completed' : 'active'} tasks
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onToggleCompleted}>
              <Check className="w-4 h-4 mr-2" />
              {showCompleted ? 'Show Active' : 'Show Completed'}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {showCompleted ? 'No completed tasks' : 'No active tasks'}
              </h3>
              <p className="text-muted-foreground">
                {showCompleted 
                  ? 'Complete some tasks to see them here'
                  : 'Add a new task to get started'
                }
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "glass-effect rounded-lg p-4 hover-lift cursor-pointer transition-all",
                  task.completed && "opacity-60"
                )}
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex items-start gap-3">
                  <button
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5",
                      task.completed
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground hover:border-primary"
                    )}
                    onClick={(e) => handleToggleComplete(e, task)}
                  >
                    {task.completed && <Check className="w-3 h-3" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-medium",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </h3>
                      <div className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority))} />
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.status && (
                        <Badge className={cn("text-xs", getStatusColor(task.status))}>
                          {task.status}
                        </Badge>
                      )}
                      {task.due_date && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </Badge>
                      )}
                      {task.links && task.links.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {task.links.length} link{task.links.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <TaskEditDialog
        task={selectedTask}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};
