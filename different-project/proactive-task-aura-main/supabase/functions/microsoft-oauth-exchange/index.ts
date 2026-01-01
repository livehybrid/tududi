
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Centralized logging function
async function logToWebhook(severity: string, message: string, data?: any) {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: webhookData } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'logging_webhook_url')
      .maybeSingle()

    if (webhookData?.value) {
      const webhookUrl = typeof webhookData.value === 'string' ? webhookData.value : String(webhookData.value);
      const cleanUrl = webhookUrl.replace(/"/g, '');
      
      if (cleanUrl) {
        await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logs: [{
              timestamp: new Date().toISOString(),
              severity,
              serviceName: 'edge-function',
              filePath: 'microsoft-oauth-exchange/index.ts',
              message,
              data
            }]
          })
        });
      }
    }
  } catch (error) {
    console.error('Failed to send log to webhook:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    await logToWebhook('INFO', 'Microsoft OAuth exchange request received');

    const { code } = await req.json()
    
    if (!code) {
      await logToWebhook('ERROR', 'Authorization code is required');
      throw new Error('Authorization code is required')
    }

    const clientId = 'd70f7fb0-49b2-4191-9e3c-491de0290845'
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')
    
    if (!clientSecret) {
      await logToWebhook('ERROR', 'Microsoft client secret not configured');
      throw new Error('Microsoft client secret not configured')
    }

    // Get redirect URI from database settings
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: redirectData } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'microsoft_redirect_uri')
      .maybeSingle()

    let redirectUri = 'https://todo.livehybrid.com/auth/microsoft/callback'; // Default fallback
    
    if (redirectData?.value) {
      const storedUri = typeof redirectData.value === 'string' ? redirectData.value : String(redirectData.value);
      redirectUri = storedUri.replace(/"/g, '');
    }
    
    await logToWebhook('INFO', 'Using redirect URI from settings', { redirectUri });

    await logToWebhook('INFO', 'Exchanging authorization code for access token', { 
      clientId,
      redirectUri: redirectUri 
    });

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://graph.microsoft.com/Tasks.ReadWrite offline_access'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      await logToWebhook('ERROR', 'Token exchange failed', { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        error: errorData,
        redirectUri 
      });
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()

    await logToWebhook('INFO', 'Microsoft OAuth exchange completed successfully', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('OAuth exchange error:', error)
    await logToWebhook('ERROR', 'Microsoft OAuth exchange error', { 
      error: error.message,
      stack: error.stack 
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
