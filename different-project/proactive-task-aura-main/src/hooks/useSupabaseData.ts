import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupabaseTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed' | 'blocked';
  project_id?: string;
  category?: string;
  due_date?: string;
  links?: string[];
  external_id?: string;
  external_source?: string;
  microsoft_last_modified?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProject {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export const useSupabaseTasks = () => {
  const [tasks, setTasks] = useState<SupabaseTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      console.log('useSupabaseTasks: Fetching tasks...');
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('useSupabaseTasks: Error fetching tasks:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const typedTasks: SupabaseTask[] = data.map(task => ({
          ...task,
          priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
          status: (task.status as 'todo' | 'in-progress' | 'completed' | 'blocked') || 'todo'
        }));
        setTasks(typedTasks);
        console.log('useSupabaseTasks: Loaded tasks:', typedTasks.length);
      }
    } catch (error) {
      console.error('useSupabaseTasks: Exception fetching tasks:', error);
    }
    setLoading(false);
  };

  const addTask = async (task: Omit<SupabaseTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      const typedTask: SupabaseTask = {
        ...data,
        priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
        status: (data.status as 'todo' | 'in-progress' | 'completed' | 'blocked') || 'todo'
      };
      setTasks(prev => [typedTask, ...prev]);
      return typedTask;
    }
    return null;
  };

  const updateTask = async (id: string, updates: Partial<SupabaseTask>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const typedTask: SupabaseTask = {
        ...data,
        priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
        status: (data.status as 'todo' | 'in-progress' | 'completed' | 'blocked') || 'todo'
      };
      setTasks(prev => prev.map(task => task.id === id ? typedTask : task));
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (!error) {
      setTasks(prev => prev.filter(task => task.id !== id));
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return { tasks, loading, addTask, updateTask, deleteTask, fetchTasks };
};

export const useSupabaseProjects = () => {
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      console.log('useSupabaseProjects: Fetching projects...');
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('useSupabaseProjects: Error fetching projects:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const typedProjects: SupabaseProject[] = data.map(project => ({
          ...project,
          status: (project.status as 'active' | 'completed' | 'archived') || 'active'
        }));
        setProjects(typedProjects);
        console.log('useSupabaseProjects: Loaded projects:', typedProjects.length);
      }
    } catch (error) {
      console.error('useSupabaseProjects: Exception fetching projects:', error);
    }
    setLoading(false);
  };

  const addProject = async (project: Omit<SupabaseProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...project, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      const typedProject: SupabaseProject = {
        ...data,
        status: (data.status as 'active' | 'completed' | 'archived') || 'active'
      };
      setProjects(prev => [typedProject, ...prev]);
    }
  };

  const updateProject = async (id: string, updates: Partial<SupabaseProject>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const typedProject: SupabaseProject = {
        ...data,
        status: (data.status as 'active' | 'completed' | 'archived') || 'active'
      };
      setProjects(prev => prev.map(project => project.id === id ? typedProject : project));
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (!error) {
      setProjects(prev => prev.filter(project => project.id !== id));
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, addProject, updateProject, deleteProject, fetchProjects };
};
