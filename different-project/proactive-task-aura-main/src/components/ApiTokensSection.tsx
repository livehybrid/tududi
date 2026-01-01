
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Copy, Key, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/lib/logger';

interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

interface NewTokenResponse {
  id: string;
  name: string;
  token: string;
}

export const ApiTokensSection = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState<NewTokenResponse | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      Logger.info('Fetching API tokens');
      const { data, error } = await supabase
        .from('user_api_tokens')
        .select('id, name, created_at, last_used_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
      Logger.info('API tokens fetched successfully', { count: data?.length });
    } catch (error) {
      Logger.error('Failed to fetch API tokens', error);
      toast({
        title: "Error",
        description: "Failed to load API tokens.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    if (!newTokenName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for the token.",
        variant: "destructive",
      });
      return;
    }

    try {
      Logger.info('Generating new API token', { tokenName: newTokenName });
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Generate a secure random token
      const tokenBytes = new Uint8Array(48);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

      // Hash the token for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: tokenData, error } = await supabase
        .from('user_api_tokens')
        .insert([{
          name: newTokenName.trim(),
          token_hash: tokenHash,
          user_id: user.id
        }])
        .select('id, name')
        .single();

      if (error) throw error;

      setNewToken({
        id: tokenData.id,
        name: tokenData.name,
        token: `aura_${token}`
      });

      setNewTokenName('');
      setShowCreateDialog(false);
      fetchTokens();

      Logger.info('API token generated successfully', { tokenId: tokenData.id });
      toast({
        title: "Token Created",
        description: "Your API token has been generated successfully.",
      });
    } catch (error) {
      Logger.error('Failed to generate API token', error);
      toast({
        title: "Error",
        description: "Failed to generate API token.",
        variant: "destructive",
      });
    }
  };

  const revokeToken = async (tokenId: string, tokenName: string) => {
    try {
      Logger.info('Revoking API token', { tokenId, tokenName });
      
      const { error } = await supabase
        .from('user_api_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      setTokens(tokens.filter(token => token.id !== tokenId));
      
      Logger.info('API token revoked successfully', { tokenId });
      toast({
        title: "Token Revoked",
        description: `Token "${tokenName}" has been revoked.`,
      });
    } catch (error) {
      Logger.error('Failed to revoke API token', error);
      toast({
        title: "Error",
        description: "Failed to revoke token.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Token copied to clipboard.",
      });
    } catch (error) {
      Logger.warn('Failed to copy to clipboard', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy token to clipboard.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          API & Integrations
        </CardTitle>
        <CardDescription>
          Manage your API access tokens for integrating with external services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Access Tokens</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Generate Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New API Token</DialogTitle>
                <DialogDescription>
                  Create a new API token for accessing the AuraTodo API.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tokenName">Token Name</Label>
                  <Input
                    id="tokenName"
                    placeholder="e.g., My Zapier Integration"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={generateToken} className="flex-1">
                    Generate Token
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No API tokens yet. Generate your first token to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{token.name}</h4>
                  <div className="text-sm text-muted-foreground space-x-4">
                    <span>Created: {formatDate(token.created_at)}</span>
                    {token.last_used_at && (
                      <span>Last used: {formatDate(token.last_used_at)}</span>
                    )}
                    {!token.last_used_at && (
                      <Badge variant="outline">Never used</Badge>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke Token</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to revoke "{token.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => revokeToken(token.id, token.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Revoke Token
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}

        {/* New Token Display Dialog */}
        {newToken && (
          <Dialog open={!!newToken} onOpenChange={() => setNewToken(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Token Generated Successfully</DialogTitle>
                <DialogDescription>
                  Copy this token now - it will not be shown again for security reasons.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Token Name</Label>
                  <Input value={newToken.name} readOnly />
                </div>
                <div>
                  <Label>API Token</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={newToken.token} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newToken.token)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Store this token securely. You won't be able to see it again after closing this dialog.
                  </p>
                </div>
                <Button onClick={() => setNewToken(null)} className="w-full">
                  I've Saved the Token
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};
