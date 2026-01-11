
import { useState } from 'react';
import { X, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface UserContextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserContextModal = ({ isOpen, onClose }: UserContextModalProps) => {
  const [userPreferences, setUserPreferences] = useState({
    name: 'John Doe',
    role: 'Product Manager',
    workingHours: '9:00 AM - 6:00 PM',
    timezone: 'EST',
    goals: 'Increase productivity and reduce decision fatigue',
    aiPersonality: 'Professional and concise',
    voiceEnabled: true,
    backgroundProcessing: true,
    smartNotifications: false
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="glass-effect rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold">User Context</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={userPreferences.name}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={userPreferences.role}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours">Working Hours</Label>
                <Input
                  id="hours"
                  value={userPreferences.workingHours}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, workingHours: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={userPreferences.timezone}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* AI Preferences */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              AI Assistant Preferences
            </h3>
            <div>
              <Label htmlFor="goals">Goals & Priorities</Label>
              <Textarea
                id="goals"
                value={userPreferences.goals}
                onChange={(e) => setUserPreferences(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="What are your main goals and priorities?"
              />
            </div>
            <div>
              <Label htmlFor="personality">AI Personality</Label>
              <Input
                id="personality"
                value={userPreferences.aiPersonality}
                onChange={(e) => setUserPreferences(prev => ({ ...prev, aiPersonality: e.target.value }))}
                placeholder="How should the AI communicate with you?"
              />
            </div>
          </div>

          {/* Feature Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Feature Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="voice">Voice Input</Label>
                <Switch
                  id="voice"
                  checked={userPreferences.voiceEnabled}
                  onCheckedChange={(checked) => setUserPreferences(prev => ({ ...prev, voiceEnabled: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="background">Background Processing</Label>
                <Switch
                  id="background"
                  checked={userPreferences.backgroundProcessing}
                  onCheckedChange={(checked) => setUserPreferences(prev => ({ ...prev, backgroundProcessing: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Smart Notifications</Label>
                <Switch
                  id="notifications"
                  checked={userPreferences.smartNotifications}
                  onCheckedChange={(checked) => setUserPreferences(prev => ({ ...prev, smartNotifications: checked }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border">
          <div className="flex gap-2">
            <Button className="flex-1">Save Preferences</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
