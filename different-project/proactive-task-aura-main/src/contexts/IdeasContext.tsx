
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  status: 'inbox' | 'reviewing' | 'converted';
}

interface IdeasContextType {
  ideas: Idea[];
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt'>) => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  convertToTask: (id: string) => void;
  convertToNote: (id: string) => void;
}

const IdeasContext = createContext<IdeasContextType | undefined>(undefined);

export const IdeasProvider = ({ children }: { children: ReactNode }) => {
  const [ideas, setIdeas] = useState<Idea[]>([
    {
      id: '1',
      title: 'Voice-to-task feature',
      description: 'Allow users to create tasks by speaking instead of typing',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: 'inbox'
    },
    {
      id: '2',
      title: 'AI-powered task prioritization',
      description: 'Use ML to automatically suggest task priorities based on deadlines and importance',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      status: 'reviewing'
    }
  ]);

  const addIdea = (ideaData: Omit<Idea, 'id' | 'createdAt'>) => {
    const newIdea: Idea = {
      ...ideaData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setIdeas(prev => [newIdea, ...prev]);
  };

  const updateIdea = (id: string, updates: Partial<Idea>) => {
    setIdeas(prev => prev.map(idea => 
      idea.id === id ? { ...idea, ...updates } : idea
    ));
  };

  const deleteIdea = (id: string) => {
    setIdeas(prev => prev.filter(idea => idea.id !== id));
  };

  const convertToTask = (id: string) => {
    setIdeas(prev => prev.map(idea => 
      idea.id === id ? { ...idea, status: 'converted' as const } : idea
    ));
  };

  const convertToNote = (id: string) => {
    setIdeas(prev => prev.map(idea => 
      idea.id === id ? { ...idea, status: 'converted' as const } : idea
    ));
  };

  return (
    <IdeasContext.Provider value={{
      ideas,
      addIdea,
      updateIdea,
      deleteIdea,
      convertToTask,
      convertToNote
    }}>
      {children}
    </IdeasContext.Provider>
  );
};

export const useIdeasContext = () => {
  const context = useContext(IdeasContext);
  if (!context) {
    throw new Error('useIdeasContext must be used within an IdeasProvider');
  }
  return context;
};
