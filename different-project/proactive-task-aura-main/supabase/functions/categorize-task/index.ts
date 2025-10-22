
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
    const { title, description, projects } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Check if categorization is enabled
    const { data: categorizationSetting } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'task_categorization_enabled')
      .single()

    if (!categorizationSetting?.value) {
      return new Response(
        JSON.stringify({ category: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OpenRouter API key
    const { data: apiKeySetting } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'openrouter_api_key')
      .single()

    const apiKey = apiKeySetting?.value

    if (!apiKey) {
      console.error('OpenRouter API key not configured')
      return new Response(
        JSON.stringify({ category: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare prompt for categorization
    const projectsList = projects.map((p: any) => `- ${p.name}: ${p.description || 'No description'}`).join('\n')
    
    const prompt = `You are a task categorization assistant. Based on the task details and available projects, suggest the most appropriate category for this task.

Task: ${title}
Description: ${description || 'No description provided'}

Available Projects:
${projectsList}

Please respond with just one word that best categorizes this task (e.g., "Work", "Personal", "Health", "Finance", "Learning", "Shopping", etc.). If the task fits well with one of the existing projects, you can suggest that project name instead. Keep it concise and relevant.`

    // Call OpenRouter API for categorization
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://auratodo.app',
        'X-Title': 'AuraTodo'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 10,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      console.error('OpenRouter API error:', response.statusText)
      return new Response(
        JSON.stringify({ category: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const category = data.choices[0]?.message?.content?.trim() || null

    return new Response(
      JSON.stringify({ category }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ category: null }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
