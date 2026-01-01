
import { TaskList } from './TaskList';
import { NotesList } from './NotesList';
import { IdeasList } from './IdeasList';
import { ProjectsList } from './ProjectsList';

interface MainViewProps {
  currentView: 'tasks' | 'notes' | 'ideas' | 'projects';
  showCompleted: boolean;
  onToggleCompleted: () => void;
}

export const MainView = ({ currentView, showCompleted, onToggleCompleted }: MainViewProps) => {
  const renderView = () => {
    switch (currentView) {
      case 'tasks':
        return <TaskList showCompleted={showCompleted} onToggleCompleted={onToggleCompleted} />;
      case 'notes':
        return <NotesList />;
      case 'ideas':
        return <IdeasList />;
      case 'projects':
        return <ProjectsList />;
      default:
        return <TaskList showCompleted={showCompleted} onToggleCompleted={onToggleCompleted} />;
    }
  };

  return (
    <div className="flex-1 h-full animate-fade-in">
      {renderView()}
    </div>
  );
};
