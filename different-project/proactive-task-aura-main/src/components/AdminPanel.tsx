
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Key, Webhook, Users, Database, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MicrosoftTodoSync } from './MicrosoftTodoSync';
import { Logger } from '@/lib/logger';

export const AdminPanel = () => {
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [loggingWebhookUrl, setLoggingWebhookUrl] = useState('');
  const [microsoftRedirectUri, setMicrosoftRedirectUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      Logger.info('Loading admin settings');
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['openrouter_api_key', 'logging_webhook_url', 'microsoft_redirect_uri']);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = typeof setting.value === 'string' ? setting.value : String(setting.value || '');
        const cleanValue = value.replace(/"/g, '');
        
        if (setting.key === 'openrouter_api_key') {
          setOpenRouterKey(cleanValue);
        } else if (setting.key === 'logging_webhook_url') {
          setLoggingWebhookUrl(cleanValue);
        } else if (setting.key === 'microsoft_redirect_uri') {
          setMicrosoftRedirectUri(cleanValue);
        }
      });

      // Set default redirect URI if not set
      if (!microsoftRedirectUri) {
        setMicrosoftRedirectUri('https://todo.livehybrid.com/auth/microsoft/callback');
      }

      Logger.info('Admin settings loaded successfully');
    } catch (error) {
      Logger.error('Failed to load admin settings', error);
      toast({
        title: "Error",
        description: "Failed to load settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      Logger.info('Saving admin settings');
      
      const updates = [
        {
          key: 'openrouter_api_key',
          value: JSON.stringify(openRouterKey),
          description: 'API key for OpenRouter chat integration'
        },
        {
          key: 'logging_webhook_url',
          value: JSON.stringify(loggingWebhookUrl),
          description: 'Webhook URL for centralized logging dispatch'
        },
        {
          key: 'microsoft_redirect_uri',
          value: JSON.stringify(microsoftRedirectUri),
          description: 'Microsoft OAuth redirect URI for token exchange'
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      // Update logger webhook URL
      Logger.setWebhookUrl(loggingWebhookUrl);

      Logger.info('Admin settings saved successfully');
      toast({
        title: "Settings Saved",
        description: "All settings have been updated successfully.",
      });
    } catch (error) {
      Logger.error('Failed to save admin settings', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage system settings and integrations</p>
          </div>
          <Badge variant="secondary" className="ml-auto">Administrator</Badge>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Configuration
                </CardTitle>
                <CardDescription>
                  Configure external API integrations for the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="openrouter">OpenRouter API Key</Label>
                  <Input
                    id="openrouter"
                    type="password"
                    placeholder="Enter OpenRouter API key..."
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Required for AI chat functionality
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Microsoft OAuth Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Microsoft OAuth Configuration
                </CardTitle>
                <CardDescription>
                  Configure Microsoft OAuth redirect URI for different hosting environments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="microsoftRedirect">Microsoft OAuth Redirect URI</Label>
                  <Input
                    id="microsoftRedirect"
                    type="url"
                    placeholder="https://your-domain.com/auth/microsoft/callback"
                    value={microsoftRedirectUri}
                    onChange={(e) => setMicrosoftRedirectUri(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Must match exactly with the URI configured in Microsoft Azure App Registration
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Logging Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="w-5 h-5" />
                  Centralized Logging
                </CardTitle>
                <CardDescription>
                  Configure webhook URL for centralized log dispatch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhook">Logging Webhook URL</Label>
                  <Input
                    id="webhook"
                    type="url"
                    placeholder="https://your-webhook-endpoint.com/logs"
                    value={loggingWebhookUrl}
                    onChange={(e) => setLoggingWebhookUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    All application logs will be sent to this webhook endpoint in real-time
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Microsoft ToDo Integration */}
            <MicrosoftTodoSync />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Settings'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
