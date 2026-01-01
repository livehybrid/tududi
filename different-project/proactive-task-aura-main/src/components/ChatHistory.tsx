
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useChatConversations } from '@/hooks/useChatConversations';
import { Plus, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatHistoryProps {
  onConversationSelect?: (conversationId: string) => void;
}

export const ChatHistory = ({ onConversationSelect }: ChatHistoryProps) => {
  const { 
    conversations, 
    currentConversation, 
    loading, 
    createConversation, 
    loadConversation, 
    deleteConversation 
  } = useChatConversations();
  const [creating, setCreating] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState<string | null>(null);

  const handleNewChat = async () => {
    setCreating(true);
    try {
      const newConversation = await createConversation();
      if (newConversation && onConversationSelect) {
        onConversationSelect(newConversation.id);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (currentConversation?.id === conversationId) return;
    
    setLoadingConversation(conversationId);
    try {
      await loadConversation(conversationId);
      if (onConversationSelect) {
        onConversationSelect(conversationId);
      }
    } finally {
      setLoadingConversation(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Button 
          onClick={handleNewChat} 
          disabled={creating}
          className="w-full"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id}
              className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 group ${
                currentConversation?.id === conversation.id ? 'bg-muted' : ''
              }`}
            >
              <div 
                onClick={() => handleSelectConversation(conversation.id)}
                className="flex items-start gap-2"
              >
                {loadingConversation === conversation.id ? (
                  <Loader2 className="h-4 w-4 mt-1 flex-shrink-0 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mt-1 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conversation.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
