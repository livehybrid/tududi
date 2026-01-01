
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMicrosoftTokenManager } from '@/hooks/useMicrosoftTokenManager';

export const MicrosoftAuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { storeTokenData } = useMicrosoftTokenManager();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for access token using our edge function
        const { data, error: exchangeError } = await supabase.functions.invoke('microsoft-oauth-exchange', {
          body: { code }
        });

        if (exchangeError) throw exchangeError;

        // Store the tokens with expiry information using the token manager
        storeTokenData(
          data.access_token,
          data.refresh_token,
          data.expires_in || 3600 // Default to 1 hour if not provided
        );

        toast({
          title: "Connected Successfully",
          description: "Microsoft ToDo has been connected with automatic token refresh enabled.",
        });

        // Redirect back to main app
        navigate('/');

      } catch (error) {
        console.error('Microsoft OAuth callback error:', error);
        toast({
          title: "Connection Failed",
          description: "Failed to connect Microsoft ToDo. Please try again.",
          variant: "destructive",
        });
        navigate('/');
      }
    };

    // Only handle callback if we're expecting it
    const intent = localStorage.getItem('microsoftAuthIntent');
    if (intent === 'todo-sync') {
      localStorage.removeItem('microsoftAuthIntent');
      handleCallback();
    } else {
      navigate('/');
    }
  }, [navigate, toast, storeTokenData]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Connecting to Microsoft ToDo with automatic token refresh...</p>
      </div>
    </div>
  );
};
