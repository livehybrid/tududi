
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

export const UserProfile = () => {
  const { profile, loading, updateProfile } = useUserProfile();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    goals: '',
    background: '',
    other_info: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        goals: profile.goals || '',
        background: profile.background || '',
        other_info: profile.other_info || ''
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateProfile(formData);
      if (success) {
        toast({
          title: "Profile Updated",
          description: "Your profile context has been saved successfully.",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Profile Context</CardTitle>
          <CardDescription>
            Provide context about yourself to help the AI assistant understand your needs better. This information will be used to personalize your chat interactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              placeholder="Describe your goals, objectives, or what you're trying to achieve..."
              value={formData.goals}
              onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background</Label>
            <Textarea
              id="background"
              placeholder="Share your professional background, experience, or relevant context..."
              value={formData.background}
              onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="other_info">Other Information</Label>
            <Textarea
              id="other_info"
              placeholder="Any other relevant information that might help the AI assist you better..."
              value={formData.other_info}
              onChange={(e) => setFormData(prev => ({ ...prev, other_info: e.target.value }))}
              rows={4}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
