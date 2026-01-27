
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Download, Upload, RefreshCw, CheckCircle, AlertCircle, Clock, Unlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMicrosoftTokenManager } from '@/hooks/useMicrosoftTokenManager';

export const MicrosoftTodoSync = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStats, setSyncStats] = useState<{
    imported: number;
    exported: number;
    conflictsResolved: number;
  } | null>(null);
  const { toast } = useToast();
  const { profile, updateProfile } = useAuth();
  const { 
    isTokenValid, 
    isRefreshing, 
    getValidAccessToken, 
    storeTokenData, 
    clearTokens 
  } = useMicrosoftTokenManager();

  const connectToMicrosoft = async () => {
    setIsConnecting(true);
    
    try {
      // Get redirect URI from database settings
      const { data: redirectData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'microsoft_redirect_uri')
        .maybeSingle();

      let redirectUri = 'https://todo.livehybrid.com/auth/microsoft/callback'; // Default fallback
      
      if (redirectData?.value) {
        const storedUri = typeof redirectData.value === 'string' ? redirectData.value : String(redirectData.value);
        redirectUri = storedUri.replace(/"/g, '');
      }

      // Microsoft Graph OAuth flow
      const clientId = 'd70f7fb0-49b2-4191-9e3c-491de0290845';
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      const scopes = encodeURIComponent('https://graph.microsoft.com/Tasks.ReadWrite offline_access');
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodedRedirectUri}&` +
        `scope=${scopes}&` +
        `response_mode=query&` +
        `prompt=select_account`; // Force account selection to ensure fresh token
      
      // Store the current intent in localStorage
      localStorage.setItem('microsoftAuthIntent', 'todo-sync');
      
      // Redirect to Microsoft OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Microsoft connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Microsoft ToDo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectMicrosoft = async () => {
    setIsDisconnecting(true);
    
    try {
      // Clear stored tokens using the token manager
      clearTokens();
      
      // Update profile to disable auto-sync
      await updateProfile({ microsoft_sync_enabled: false });
      
      toast({
        title: "Disconnected",
        description: "Microsoft ToDo has been disconnected from your account.",
      });
      
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Failed", 
        description: "Failed to disconnect Microsoft ToDo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const performSync = async (direction: 'import' | 'export' | 'bidirectional') => {
    setIsSyncing(true);
    setSyncStatus('idle');
    
    try {
      // Get a valid access token (automatically refreshes if needed)
      const accessToken = await getValidAccessToken();
      
      if (!accessToken) {
        toast({
          title: "Authentication Required",
          description: "Please connect to Microsoft ToDo first.",
          variant: "destructive",
        });
        return;
      }

      console.log('Starting sync with valid token');

      const { data, error } = await supabase.functions.invoke('microsoft-todo-bidirectional-sync', {
        body: { accessToken, direction }
      });

      if (error) {
        throw error;
      }

      setSyncStatus('success');
      setLastSync(new Date());
      setSyncStats({
        imported: data.imported || 0,
        exported: data.exported || 0,
        conflictsResolved: data.conflictsResolved || 0
      });
      
      const directionText = direction === 'bidirectional' ? 'Two-way sync' : 
                           direction === 'import' ? 'Import' : 'Export';
      
      toast({
        title: "Sync Complete",
        description: `${directionText} completed successfully. Imported: ${data.imported || 0}, Exported: ${data.exported || 0}`,
      });

    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      
      toast({
        title: "Sync Failed",
        description: "Failed to sync with Microsoft ToDo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = async (enabled: boolean) => {
    try {
      await updateProfile({ microsoft_sync_enabled: enabled });

      toast({
        title: enabled ? "Auto-sync Enabled" : "Auto-sync Disabled",
        description: enabled ? 
          "Microsoft ToDo will sync automatically every 15 minutes." :
          "Automatic syncing has been disabled.",
      });
    } catch (error) {
      console.error('Auto-sync toggle error:', error);
      toast({
        title: "Settings Update Failed",
        description: "Failed to update auto-sync settings.",
        variant: "destructive",
      });
    }
  };

  const autoSync = profile?.microsoft_sync_enabled || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          Microsoft ToDo Integration
          <Badge variant="outline" className="ml-auto">Two-way Sync</Badge>
        </CardTitle>
        <CardDescription>
          Bidirectional sync with AI categorization and automatic token refresh
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {isTokenValid ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
            {isRefreshing && (
              <Badge variant="outline" className="bg-blue-50">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Refreshing Token
              </Badge>
            )}
          </div>
          
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Last sync: {lastSync.toLocaleString()}
            </span>
          )}
        </div>

        {/* Auto-sync toggle */}
        {isTokenValid && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <span className="text-sm font-medium">Automatic Sync</span>
              <p className="text-xs text-muted-foreground">Sync every 15 minutes with auto token refresh</p>
            </div>
            <Switch 
              checked={autoSync} 
              onCheckedChange={toggleAutoSync}
            />
          </div>
        )}

        {/* Connection/Sync buttons */}
        <div className="space-y-2">
          {!isTokenValid ? (
            <Button 
              onClick={connectToMicrosoft}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect to Microsoft ToDo'
              )}
            </Button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => performSync('bidirectional')}
                  disabled={isSyncing || isRefreshing}
                  variant="default"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Two-way Sync
                </Button>
                
                <Button 
                  onClick={() => performSync('import')}
                  disabled={isSyncing || isRefreshing}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Import Only
                </Button>
              </div>
              
              <Button 
                onClick={disconnectMicrosoft}
                disabled={isDisconnecting || isSyncing}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="w-4 h-4 mr-2" />
                    Disconnect Microsoft ToDo
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Sync stats */}
        {syncStats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{syncStats.imported}</div>
              <div className="text-xs text-blue-600">Imported</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{syncStats.exported}</div>
              <div className="text-xs text-green-600">Exported</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <div className="text-lg font-bold text-yellow-600">{syncStats.conflictsResolved}</div>
              <div className="text-xs text-yellow-600">Conflicts</div>
            </div>
          </div>
        )}

        {syncStatus === 'success' && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            ✓ Successfully synced Microsoft ToDo tasks with automatic token refresh
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            ✗ Failed to sync Microsoft ToDo tasks. Automatic retry with token refresh will occur.
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Smart Authentication:</strong> Automatic token refresh prevents disconnections</p>
          <p>• <strong>Two-way sync:</strong> Local tasks exported, Microsoft tasks imported</p>
          <p>• <strong>AI Enhancement:</strong> Auto-categorization and project mapping</p>
          <p>• <strong>Auto-sync:</strong> Background sync every 15 minutes when enabled</p>
        </div>
      </CardContent>
    </Card>
  );
};
