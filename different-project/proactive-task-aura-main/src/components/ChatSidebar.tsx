
import { useState } from 'react';
import { Send, Mic, Brain, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatContext } from '@/contexts/ChatContext';
import { useTaskContext } from '@/contexts/TaskContext';
import { useNotesContext } from '@/contexts/NotesContext';
import { useIdeasContext } from '@/contexts/IdeasContext';

interface ChatSidebarProps {
  currentView: 'tasks' | 'notes' | 'ideas' | 'projects';
  onViewChange: (view: 'tasks' | 'notes' | 'ideas' | 'projects') => void;
}

export const ChatSidebar = ({ currentView, onViewChange }: ChatSidebarProps) => {
  const [inputValue, setInputValue] = useState('');
  const { messages, addMessage, isTyping, setIsTyping } = useChatContext();
  const { addTask } = useTaskContext();
  const { addNote } = useNotesContext();
  const { addIdea } = useIdeasContext();

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    addMessage({
      content: inputValue,
      sender: 'user'
    });

    const userMessage = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      handleAIResponse(userMessage);
      setIsTyping(false);
    }, 1500);
  };

  const handleAIResponse = (userMessage: string) => {
    // Simple AI simulation - in real app this would be API calls
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('create task') || lowerMessage.includes('add task')) {
      const taskTitle = userMessage.replace(/create task|add task/gi, '').trim() || 'New Task';
      addTask({
        title: taskTitle,
        completed: false,
        priority: 'medium'
      });
      
      addMessage({
        content: `I've created a new task: "${taskTitle}". You can find it in your task list.`,
        sender: 'agent',
        agent: 'TaskListAgent',
        response: {
          response: `I've created a new task: "${taskTitle}". You can find it in your task list.`,
          agent: 'TaskListAgent',
          message: 'Task created successfully',
          delegate: true,
          switch_view: true
        }
      });
      onViewChange('tasks');
    } else if (lowerMessage.includes('create note') || lowerMessage.includes('add note')) {
      const noteTitle = userMessage.replace(/create note|add note/gi, '').trim() || 'New Note';
      addNote({
        title: noteTitle,
        content: '',
        tags: []
      });
      
      addMessage({
        content: `I've created a new note: "${noteTitle}". You can edit it in your notes section.`,
        sender: 'agent',
        agent: 'NoteListAgent'
      });
      onViewChange('notes');
    } else if (lowerMessage.includes('idea') || lowerMessage.includes('brainstorm')) {
      const ideaTitle = userMessage.replace(/idea|brainstorm/gi, '').trim() || 'New Idea';
      addIdea({
        title: ideaTitle,
        status: 'inbox'
      });
      
      addMessage({
        content: `I've captured your idea: "${ideaTitle}". It's now in your idea inbox for review.`,
        sender: 'agent',
        agent: 'IdeaListAgent'
      });
      onViewChange('ideas');
    } else {
      // Default orchestrator response
      addMessage({
        content: `I understand you said: "${userMessage}". I can help you with tasks, notes, ideas, and projects. Try saying things like "create task review budget" or "add note about meeting".`,
        sender: 'agent',
        agent: 'Orchestrator'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gradient">Aura</h1>
            <p className="text-xs text-sidebar-foreground/60">AI Assistant</p>
          </div>
        </div>

        {/* View Navigation */}
        <div className="grid grid-cols-2 gap-1">
          {[
            { key: 'tasks', label: 'Tasks' },
            { key: 'notes', label: 'Notes' },
            { key: 'ideas', label: 'Ideas' },
            { key: 'projects', label: 'Projects' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={currentView === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(key as any)}
              className="text-xs h-8"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sidebar-accent text-sidebar-foreground'
                }`}
              >
                {message.sender === 'agent' && message.agent && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {message.agent}
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-sidebar-accent rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message Aura..."
            className="flex-1 bg-sidebar-accent border-sidebar-border"
          />
          <Button 
            onClick={handleSendMessage}
            size="icon"
            disabled={!inputValue.trim() || isTyping}
          >
            <Send className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Mic className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-sidebar-foreground/50 text-center">
          Press Q for quick add • F to search • T for voice
        </div>
      </div>
    </div>
  );
};
