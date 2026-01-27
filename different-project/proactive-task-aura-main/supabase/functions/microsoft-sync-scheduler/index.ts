
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting automated Microsoft sync for all users...')

    // Get all users with Microsoft sync enabled and valid tokens
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, email, microsoft_sync_enabled, last_microsoft_sync')
      .eq('microsoft_sync_enabled', true)

    if (!profiles || profiles.length === 0) {
      console.log('No users with Microsoft sync enabled')
      return new Response(
        JSON.stringify({ message: 'No users to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let syncedUsers = 0
    let errors = 0

    for (const profile of profiles) {
      try {
        // Check if user needs sync (last sync > 15 minutes ago)
        const lastSync = profile.last_microsoft_sync ? new Date(profile.last_microsoft_sync) : null
        const now = new Date()
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)

        if (lastSync && lastSync > fifteenMinutesAgo) {
          console.log(`Skipping user ${profile.email} - synced recently`)
          continue
        }

        // Get stored access token (you'd need to implement token storage/refresh)
        const accessToken = await getStoredAccessToken(supabaseClient, profile.id)
        
        if (!accessToken) {
          console.log(`No access token for user ${profile.email}`)
          continue
        }

        // Trigger bidirectional sync
        const syncResponse = await supabaseClient.functions.invoke('microsoft-todo-bidirectional-sync', {
          body: { accessToken, direction: 'bidirectional' }
        })

        if (syncResponse.error) {
          console.error(`Sync failed for user ${profile.email}:`, syncResponse.error)
          errors++
        } else {
          console.log(`Sync completed for user ${profile.email}`)
          syncedUsers++
        }

      } catch (error) {
        console.error(`Error syncing user ${profile.email}:`, error)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        syncedUsers,
        errors,
        totalUsers: profiles.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Scheduler error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function getStoredAccessToken(supabaseClient: any, userId: string): Promise<string | null> {
  // This would need to be implemented - storing encrypted tokens in database
  // For now, returning null as we'd need to implement secure token storage
  console.log(`Getting stored access token for user: ${userId}`)
  return null
}
