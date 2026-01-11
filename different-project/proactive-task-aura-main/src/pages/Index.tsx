
import { useState } from 'react';
import { User, Settings, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskList } from '@/components/TaskList';
import { ProjectsList } from '@/components/ProjectsList';
import { ChatInterface } from '@/components/ChatInterface';
import { AdminPanel } from '@/components/AdminPanel';
import { TaskForm } from '@/components/TaskForm';
import { TaskEditDialog } from '@/components/TaskEditDialog';
import { ProjectForm } from '@/components/ProjectForm';
import { useAuth } from '@/contexts/AuthContext';
import { TaskProvider } from '@/contexts/TaskContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';

const Index = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <TaskProvider>
      <ProjectsProvider>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
          <div className="container mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  AuraTodo
                </h1>
                <p className="text-muted-foreground">AI-powered productivity platform</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user?.email}</span>
                  {isAdmin && <Badge variant="secondary">Admin</Badge>}
                </div>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Main Content - Full Width with proper scrolling */}
            <div className="h-[calc(100vh-200px)]">
              <div className="glass-effect rounded-lg h-full overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                    <TabsList className="grid w-fit grid-cols-4">
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="projects">Projects</TabsTrigger>
                      {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
                    </TabsList>
                    
                    <div className="flex gap-2">
                      {activeTab === 'tasks' && <TaskForm />}
                      {activeTab === 'projects' && <ProjectForm />}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                      <ChatInterface />
                    </TabsContent>
                    
                    <TabsContent value="tasks" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                      <TaskList 
                        showCompleted={showCompleted} 
                        onToggleCompleted={() => setShowCompleted(!showCompleted)}
                      />
                    </TabsContent>
                    
                    <TabsContent value="projects" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                      <ProjectsList />
                    </TabsContent>
                    
                    {isAdmin && (
                      <TabsContent value="admin" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                        <AdminPanel />
                      </TabsContent>
                    )}
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </ProjectsProvider>
    </TaskProvider>
  );
};

export default Index;
