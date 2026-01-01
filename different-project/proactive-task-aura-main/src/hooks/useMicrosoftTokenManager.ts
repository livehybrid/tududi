
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  issued_at: number; // Unix timestamp
}

export const useMicrosoftTokenManager = () => {
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Get stored token data
  const getTokenData = (): TokenData | null => {
    try {
      const access_token = localStorage.getItem('microsoft_access_token');
      const refresh_token = localStorage.getItem('microsoft_refresh_token');
      const expires_at = localStorage.getItem('microsoft_token_expires_at');
      const issued_at = localStorage.getItem('microsoft_token_issued_at');

      if (!access_token || !refresh_token || !expires_at || !issued_at) {
        return null;
      }

      return {
        access_token,
        refresh_token,
        expires_at: parseInt(expires_at),
        issued_at: parseInt(issued_at)
      };
    } catch (error) {
      console.error('Error getting token data:', error);
      return null;
    }
  };

  // Store token data with expiry information
  const storeTokenData = (accessToken: string, refreshToken: string, expiresIn: number) => {
    const now = Date.now();
    const expiresAt = now + (expiresIn * 1000); // Convert seconds to milliseconds

    localStorage.setItem('microsoft_access_token', accessToken);
    localStorage.setItem('microsoft_refresh_token', refreshToken);
    localStorage.setItem('microsoft_token_expires_at', expiresAt.toString());
    localStorage.setItem('microsoft_token_issued_at', now.toString());

    setIsTokenValid(true);
    scheduleTokenRefresh(expiresAt);
  };

  // Check if token is expired or will expire soon (within 5 minutes)
  const isTokenExpiringSoon = (tokenData: TokenData): boolean => {
    const now = Date.now();
    const fiveMinutesFromNow = now + (5 * 60 * 1000); // 5 minutes in milliseconds
    return tokenData.expires_at <= fiveMinutesFromNow;
  };

  // Refresh the access token
  const refreshAccessToken = async (): Promise<boolean> => {
    const tokenData = getTokenData();
    
    if (!tokenData?.refresh_token) {
      console.log('No refresh token available');
      setIsTokenValid(false);
      return false;
    }

    setIsRefreshing(true);

    try {
      console.log('Refreshing Microsoft access token...');
      
      const { data, error } = await supabase.functions.invoke('microsoft-oauth-refresh', {
        body: { refreshToken: tokenData.refresh_token }
      });

      if (error) {
        console.error('Token refresh failed:', error);
        
        // If refresh fails, clear tokens and notify user
        clearTokens();
        toast({
          title: "Authentication Expired",
          description: "Please reconnect to Microsoft ToDo.",
          variant: "destructive",
        });
        return false;
      }

      // Store the new tokens
      storeTokenData(
        data.access_token, 
        data.refresh_token || tokenData.refresh_token, // Use new refresh token if provided, otherwise keep existing
        data.expires_in || 3600 // Default to 1 hour if not provided
      );

      console.log('Token refresh successful');
      toast({
        title: "Token Refreshed",
        description: "Microsoft ToDo connection renewed automatically.",
      });

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearTokens();
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clear all stored tokens
  const clearTokens = () => {
    localStorage.removeItem('microsoft_access_token');
    localStorage.removeItem('microsoft_refresh_token');
    localStorage.removeItem('microsoft_token_expires_at');
    localStorage.removeItem('microsoft_token_issued_at');
    
    setIsTokenValid(false);
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
  };

  // Schedule automatic token refresh
  const scheduleTokenRefresh = (expiresAt: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Schedule refresh 10 minutes before expiry
    const refreshTime = expiresAt - (10 * 60 * 1000);
    const now = Date.now();
    const timeUntilRefresh = refreshTime - now;

    if (timeUntilRefresh > 0) {
      console.log(`Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
      
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Automatic token refresh triggered');
        refreshAccessToken();
      }, timeUntilRefresh);
    } else {
      // Token is already expired or expires very soon, refresh immediately
      refreshAccessToken();
    }
  };

  // Get a valid access token (refreshing if necessary)
  const getValidAccessToken = async (): Promise<string | null> => {
    const tokenData = getTokenData();
    
    if (!tokenData) {
      console.log('No token data found');
      return null;
    }

    // If token is expiring soon, refresh it
    if (isTokenExpiringSoon(tokenData)) {
      console.log('Token expiring soon, refreshing...');
      const refreshed = await refreshAccessToken();
      
      if (!refreshed) {
        return null;
      }
      
      // Get the new token data
      const newTokenData = getTokenData();
      return newTokenData?.access_token || null;
    }

    return tokenData.access_token;
  };

  // Initialize token validation and scheduling on mount
  useEffect(() => {
    const tokenData = getTokenData();
    
    if (tokenData) {
      if (isTokenExpiringSoon(tokenData)) {
        // Token is expiring soon, refresh immediately
        refreshAccessToken();
      } else {
        setIsTokenValid(true);
        scheduleTokenRefresh(tokenData.expires_at);
      }
    } else {
      setIsTokenValid(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTokenValid,
    isRefreshing,
    getValidAccessToken,
    storeTokenData,
    clearTokens,
    refreshAccessToken
  };
};
