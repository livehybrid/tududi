
import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTaskContext } from '@/contexts/TaskContext';
import { useNotesContext } from '@/contexts/NotesContext';
import { useIdeasContext } from '@/contexts/IdeasContext';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { tasks } = useTaskContext();
  const { notes } = useNotesContext();
  const { ideas } = useIdeasContext();

  const searchResults = [
    ...tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(task => ({ ...task, type: 'task' })),
    ...notes.filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(note => ({ ...note, type: 'note' })),
    ...ideas.filter(idea =>
      idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(idea => ({ ...idea, type: 'idea' }))
  ].filter(item => searchTerm.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="glass-effect rounded-lg w-full max-w-2xl mx-4 animate-scale-in">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search everything..."
            className="border-0 bg-transparent focus-visible:ring-0"
            autoFocus
          />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-4">
            {searchTerm.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Start typing to search...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No results found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((item: any) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {item.type}
                      </span>
                      <h3 className="font-medium">{item.title || item.name}</h3>
                    </div>
                    {(item.description || item.content) && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description || item.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
