
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'completed' | 'blocked';
  projectId?: string;
  createdAt: Date;
  dueDate?: Date;
  links?: string[];
}

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Review Q4 budget proposal',
      description: 'Analyze the financial projections and resource allocation',
      completed: false,
      priority: 'high',
      status: 'todo',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      links: ['https://example.com/budget']
    },
    {
      id: '2',
      title: 'Schedule team meeting',
      completed: false,
      priority: 'medium',
      status: 'todo',
      createdAt: new Date(),
    },
    {
      id: '3',
      title: 'Update project documentation',
      completed: true,
      priority: 'low',
      status: 'completed',
      createdAt: new Date(),
    }
  ]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleTask
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
