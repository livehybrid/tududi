
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender: 'user' | 'agent';
  agent?: string;
  timestamp: string;
  response?: any;
}

export const useChatConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateConversationTitle = async (conversationId: string) => {
    try {
      // Get the first few messages to generate a title
      const { data: firstMessages, error } = await supabase
        .from('chat_messages')
        .select('content, sender')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
        .limit(3);

      if (error || !firstMessages || firstMessages.length === 0) {
        return 'New Chat';
      }

      // Create a prompt for title generation
      const messageContent = firstMessages
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const { data, error: titleError } = await supabase.functions.invoke('openrouter-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `Generate a short, descriptive title (max 4 words) for this conversation:\n\n${messageContent}`
          }],
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          systemPrompt: 'You are a helpful assistant that generates short, descriptive titles for conversations. Respond with only the title, nothing else. Keep it under 4 words.'
        }
      });

      if (titleError) throw titleError;

      const title = data.response?.trim().replace(/"/g, '') || 'New Chat';
      
      // Update the conversation title in the database
      const { error: updateError } = await supabase
        .from('chat_conversations')
        .update({ title })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId ? { ...conv, title } : conv
        )
      );

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
      }

      return title;
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Chat';
    }
  };

  const createConversation = async (title: string = 'New Chat') => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert([{ user_id: user.id, title }])
        .select()
        .single();

      if (error) throw error;
      
      const newConversation = data as ChatConversation;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (msgError) throw msgError;

      const typedConversation = conversation as ChatConversation;
      setCurrentConversation(typedConversation);
      
      const typedMessages: ChatMessage[] = (messages || []).map(msg => ({
        ...msg,
        sender: msg.sender as 'user' | 'agent'
      }));
      setMessages(typedMessages);

      // Update conversations list to reflect the current one
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId ? typedConversation : conv
        )
      );
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'conversation_id'>) => {
    if (!currentConversation) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ ...message, conversation_id: currentConversation.id }])
        .select()
        .single();

      if (error) throw error;

      const newMessage: ChatMessage = {
        ...data,
        sender: data.sender as 'user' | 'agent'
      };
      setMessages(prev => [...prev, newMessage]);

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversation.id);

      // Generate title if this is the first user message and title is still "New Chat"
      if (message.sender === 'user' && currentConversation.title === 'New Chat') {
        setTimeout(() => {
          generateConversationTitle(currentConversation.id);
        }, 1000); // Wait a bit for the AI response to be saved
      }

      return newMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    createConversation,
    loadConversation,
    saveMessage,
    deleteConversation,
    setMessages
  };
};
