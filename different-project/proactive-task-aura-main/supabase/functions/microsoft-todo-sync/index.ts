
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

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabaseClient.auth.getUser(token)
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { accessToken } = await req.json()
    
    if (!accessToken) {
      throw new Error('Microsoft access token is required')
    }

    // Fetch tasks from Microsoft ToDo
    const response = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.statusText}`)
    }

    const data = await response.json()
    const todoTasks = data.value || []

    // Get user's projects for categorization
    const { data: projects } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('user_id', user.id)

    const enrichedTasks = []

    for (const todoTask of todoTasks) {
      // Skip if task already exists (check by external_id)
      const { data: existingTask } = await supabaseClient
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('external_id', todoTask.id)
        .single()

      if (existingTask) continue

      // Enrich task using OpenRouter
      let category = null
      try {
        const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
        if (openrouterKey) {
          const categorizeResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://auratodo.com',
              'X-Title': 'AuraTodo'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are a task categorization assistant. Based on the task title and description, suggest the most appropriate category or project assignment. Available projects: ${projects?.map(p => p.name).join(', ') || 'None'}. Respond with just the category name or project name, nothing else.`
                },
                {
                  role: 'user',
                  content: `Task: ${todoTask.title}\nDescription: ${todoTask.body?.content || ''}`
                }
              ],
              max_tokens: 50
            })
          })

          if (categorizeResponse.ok) {
            const result = await categorizeResponse.json()
            category = result.choices?.[0]?.message?.content?.trim()
          }
        }
      } catch (error) {
        console.error('Categorization error:', error)
      }

      // Determine priority based on importance
      let priority = 'medium'
      if (todoTask.importance === 'high') priority = 'high'
      if (todoTask.importance === 'low') priority = 'low'

      // Determine status
      let status = 'todo'
      if (todoTask.status === 'completed') status = 'completed'
      if (todoTask.status === 'inProgress') status = 'in-progress'

      // Find matching project
      let projectId = null
      if (category && projects) {
        const matchingProject = projects.find(p => 
          p.name.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(p.name.toLowerCase())
        )
        if (matchingProject) {
          projectId = matchingProject.id
        }
      }

      const enrichedTask = {
        user_id: user.id,
        title: todoTask.title,
        description: todoTask.body?.content || null,
        completed: todoTask.status === 'completed',
        priority,
        status,
        project_id: projectId,
        category,
        due_date: todoTask.dueDateTime?.dateTime ? new Date(todoTask.dueDateTime.dateTime).toISOString() : null,
        external_id: todoTask.id,
        external_source: 'microsoft_todo',
        links: todoTask.linkedResources?.length > 0 ? todoTask.linkedResources.map((r: any) => r.webUrl).filter(Boolean) : null
      }

      enrichedTasks.push(enrichedTask)
    }

    // Insert enriched tasks into Supabase
    if (enrichedTasks.length > 0) {
      const { data: insertedTasks, error } = await supabaseClient
        .from('tasks')
        .insert(enrichedTasks)
        .select()

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          imported: insertedTasks.length,
          tasks: insertedTasks 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: 0,
        message: 'No new tasks to import'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
