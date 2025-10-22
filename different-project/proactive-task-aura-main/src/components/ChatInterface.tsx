import { useState, useEffect } from 'react';
import { Send, Bot, User, Settings, History, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ChatHistory } from '@/components/ChatHistory';
import { UserProfile } from '@/components/UserProfile';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatInterface = () => {
  const [input, setInput] = useState('');
  const [selectedLlm, setSelectedLlm] = useState('');
  const [availableLlms, setAvailableLlms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { 
    currentConversation, 
    messages: dbMessages, 
    createConversation, 
    saveMessage, 
    setMessages,
    loadConversation
  } = useChatConversations();
  
  const { profile } = useUserProfile();

  // Convert database messages to display format
  const messages: Message[] = dbMessages.map(msg => ({
    id: msg.id,
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content,
    timestamp: new Date(msg.timestamp)
  }));

  useEffect(() => {
    fetchAvailableLlms();
  }, []);

  // Auto-create first conversation if none exists
  useEffect(() => {
    if (!currentConversation && !loading) {
      createConversation();
    }
  }, [currentConversation, loading, createConversation]);

  const fetchAvailableLlms = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'approved_llms')
      .single();
    
    if (data?.value && Array.isArray(data.value)) {
      const llmArray = data.value as string[];
      setAvailableLlms(llmArray);
      if (llmArray.length > 0) {
        setSelectedLlm(llmArray[0]);
      }
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    await loadConversation(conversationId);
    setShowHistory(false);
  };

  const buildSystemPromptWithContext = () => {
    let systemPrompt = `System Prompt

Your role
you are main Chat Agent, AI assistant inside of AuraTodo app

your job is to

communicate with the User

based on user instructions and situation, respond or communicate / delegate to specialized agents

only delegate when you need to! if you have enough info to answer, just answer!

when listing things out, ALWAYS put each item on a new line

make sure to follow the user's instructions for outputting and formatting your message

About Aura
Aura is an AI-powered productivity app
GOAL
the goal of Aura  is to make the user more productive`;

    if (profile) {
      systemPrompt += `\n\nUser Context Information:`;
      
      if (profile.goals) {
        systemPrompt += `\n\nUser Goals:\n${profile.goals}`;
      }
      
      if (profile.background) {
        systemPrompt += `\n\nUser Background:\n${profile.background}`;
      }
      
      if (profile.other_info) {
        systemPrompt += `\n\nAdditional User Information:\n${profile.other_info}`;
      }
    }

    return systemPrompt;
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedLlm || !currentConversation) return;

    // Save user message to database
    const savedUserMessage = await saveMessage({
      content: input,
      sender: 'user'
    });

    if (!savedUserMessage) return;

    setInput('');
    setLoading(true);

    try {
      // Prepare messages for API call
      const apiMessages = [...messages, {
        id: savedUserMessage.id,
        role: 'user' as const,
        content: savedUserMessage.content,
        timestamp: new Date(savedUserMessage.timestamp)
      }];

      // Call the OpenRouter edge function with user context
      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: {
          messages: apiMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          model: selectedLlm,
          systemPrompt: buildSystemPromptWithContext()
        }
      });

      if (error) throw error;

      // Save assistant response to database
      await saveMessage({
        content: data.response,
        sender: 'agent',
        agent: selectedLlm
      });

    } catch (error) {
      console.error('Chat error:', error);
      
      // Save error message to database
      await saveMessage({
        content: 'Sorry, there was an error processing your message. Please make sure the OpenRouter API key is configured correctly in the admin panel.',
        sender: 'agent',
        agent: 'system'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6" />
            <h2 className="text-xl font-semibold">AuraTodo Chat Agent</h2>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={showProfile} onOpenChange={setShowProfile}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[600px] sm:w-[800px]">
                <SheetHeader>
                  <SheetTitle>User Profile</SheetTitle>
                  <SheetDescription>
                    Manage your profile context for better AI assistance
                  </SheetDescription>
                </SheetHeader>
                <UserProfile />
              </SheetContent>
            </Sheet>

            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[400px]">
                <SheetHeader>
                  <SheetTitle>Chat History</SheetTitle>
                  <SheetDescription>
                    View and manage your previous conversations
                  </SheetDescription>
                </SheetHeader>
                <ChatHistory onConversationSelect={handleConversationSelect} />
              </SheetContent>
            </Sheet>

            <Select value={selectedLlm} onValueChange={setSelectedLlm}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select LLM model" />
              </SelectTrigger>
              <SelectContent>
                {availableLlms.map((llm) => (
                  <SelectItem key={llm} value={llm}>
                    {llm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Hello! I'm your AuraTodo Chat Agent. How can I help you today?</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <Card className={`max-w-[80%] p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && <Bot className="h-4 w-4 mt-0.5" />}
                  {message.role === 'user' && <User className="h-4 w-4 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 opacity-70`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 justify-start">
              <Card className="max-w-[80%] p-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading || !selectedLlm || !currentConversation}
          />
          <Button 
            onClick={sendMessage} 
            disabled={loading || !input.trim() || !selectedLlm || !currentConversation}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
