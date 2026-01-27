
import { useState } from 'react';
import { Plus, Search, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useIdeasContext } from '@/contexts/IdeasContext';
import { formatDistanceToNow } from 'date-fns';

export const IdeasList = () => {
  const { ideas, convertToTask, convertToNote } = useIdeasContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIdeas = ideas.filter(idea => 
    idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inbox': return 'bg-blue-500';
      case 'reviewing': return 'bg-yellow-500';
      case 'converted': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Ideas</h1>
            <p className="text-muted-foreground">{filteredIdeas.length} ideas in your inbox</p>
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Capture Idea
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ideas..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Ideas List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-4">
            {filteredIdeas.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No ideas yet</h3>
                <p className="text-muted-foreground">Start capturing your thoughts and ideas</p>
              </div>
            ) : (
              filteredIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="glass-effect rounded-lg p-4 hover-lift"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{idea.title}</h3>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(idea.status)}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(idea.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  
                  {idea.description && (
                    <p className="text-muted-foreground text-sm mb-3">{idea.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {idea.status}
                    </Badge>
                    
                    {idea.status !== 'converted' && (
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => convertToTask(idea.id)}
                          className="h-7 text-xs"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          To Task
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => convertToNote(idea.id)}
                          className="h-7 text-xs"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          To Note
                        </Button>
                      </div>
                    )}
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
