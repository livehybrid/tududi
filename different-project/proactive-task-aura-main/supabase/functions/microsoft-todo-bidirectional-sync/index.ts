
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

    const { accessToken, direction = 'bidirectional' } = await req.json()
    
    if (!accessToken) {
      throw new Error('Microsoft access token is required')
    }

    console.log(`Starting ${direction} sync for user: ${user.id}`)

    let importedCount = 0
    let exportedCount = 0
    let conflictsResolved = 0

    // IMPORT: Microsoft → Supabase
    if (direction === 'import' || direction === 'bidirectional') {
      const importResult = await importFromMicrosoft(supabaseClient, user.id, accessToken)
      importedCount = importResult.imported
    }

    // EXPORT: Supabase → Microsoft 
    if (direction === 'export' || direction === 'bidirectional') {
      const exportResult = await exportToMicrosoft(supabaseClient, user.id, accessToken)
      exportedCount = exportResult.exported
      conflictsResolved = exportResult.conflictsResolved
    }

    // Update last sync timestamp
    await supabaseClient
      .from('profiles')
      .update({ 
        last_microsoft_sync: new Date().toISOString(),
        microsoft_sync_enabled: true 
      })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedCount,
        exported: exportedCount,
        conflictsResolved,
        lastSync: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Bidirectional sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function importFromMicrosoft(supabaseClient: any, userId: string, accessToken: string) {
  console.log('Starting import from Microsoft...')
  
  // First, fetch all ToDo lists
  const listsResponse = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!listsResponse.ok) {
    throw new Error(`Microsoft Graph API error: ${listsResponse.statusText}`)
  }

  const listsData = await listsResponse.json()
  const todoLists = listsData.value || []
  console.log(`Found ${todoLists.length} Microsoft ToDo lists`)

  // Get user's existing projects for mapping
  const { data: existingProjects } = await supabaseClient
    .from('projects')
    .select('*')
    .eq('user_id', userId)

  const projectMap = new Map()
  if (existingProjects) {
    existingProjects.forEach(project => {
      projectMap.set(project.name.toLowerCase(), project.id)
    })
  }

  let totalImported = 0

  // Process each list
  for (const list of todoLists) {
    console.log(`Processing list: ${list.displayName}`)
    
    // Find or create project for this list
    let projectId = projectMap.get(list.displayName.toLowerCase())
    
    if (!projectId) {
      console.log(`Creating new project for list: ${list.displayName}`)
      const { data: newProject, error: projectError } = await supabaseClient
        .from('projects')
        .insert([{
          user_id: userId,
          name: list.displayName,
          description: `Imported from Microsoft ToDo list`,
          color: getRandomColor(),
          status: 'active'
        }])
        .select()
        .single()

      if (!projectError && newProject) {
        projectId = newProject.id
        projectMap.set(list.displayName.toLowerCase(), projectId)
      }
    }

    // Fetch tasks from this specific list
    const tasksResponse = await fetch(`https://graph.microsoft.com/v1.0/me/todo/lists/${list.id}/tasks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!tasksResponse.ok) {
      console.error(`Failed to fetch tasks from list ${list.displayName}: ${tasksResponse.statusText}`)
      continue
    }

    const tasksData = await tasksResponse.json()
    const todoTasks = tasksData.value || []
    console.log(`Found ${todoTasks.length} tasks in list: ${list.displayName}`)

    const enrichedTasks = []

    for (const todoTask of todoTasks) {
      // Skip if task already exists and is up to date
      const { data: existingTask } = await supabaseClient
        .from('tasks')
        .select('id, updated_at')
        .eq('user_id', userId)
        .eq('external_id', todoTask.id)
        .single()

      const msUpdated = new Date(todoTask.lastModifiedDateTime)
      const localUpdated = existingTask ? new Date(existingTask.updated_at) : null

      if (existingTask && localUpdated && msUpdated <= localUpdated) {
        console.log(`Skipping task ${todoTask.id} - no updates needed`)
        continue
      }

      // Enrich task using AI categorization
      let category = list.displayName
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
                  content: `You are a task categorization assistant. Based on the task title and description, suggest the most appropriate category. The task is from the "${list.displayName}" list. Respond in JSON format: {"category": "category_name"}`
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
            const aiResult = JSON.parse(result.choices?.[0]?.message?.content || '{}')
            if (aiResult.category) {
              category = aiResult.category
            }
          }
        }
      } catch (error) {
        console.error('AI categorization error:', error)
      }

      // Determine priority based on importance
      let priority = 'medium'
      if (todoTask.importance === 'high') priority = 'high'
      if (todoTask.importance === 'low') priority = 'low'

      // Determine status
      let status = 'todo'
      if (todoTask.status === 'completed') status = 'completed'
      if (todoTask.status === 'inProgress') status = 'in-progress'

      const enrichedTask = {
        user_id: userId,
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
        links: todoTask.linkedResources?.length > 0 ? todoTask.linkedResources.map((r: any) => r.webUrl).filter(Boolean) : null,
        microsoft_last_modified: todoTask.lastModifiedDateTime
      }

      enrichedTasks.push(enrichedTask)
    }

    // Upsert enriched tasks from this list
    if (enrichedTasks.length > 0) {
      const { error } = await supabaseClient
        .from('tasks')
        .upsert(enrichedTasks, { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error(`Error upserting tasks from list ${list.displayName}:`, error)
      } else {
        totalImported += enrichedTasks.length
        console.log(`Imported ${enrichedTasks.length} tasks from list: ${list.displayName}`)
      }
    }
  }

  console.log(`Import completed: ${totalImported} tasks processed from ${todoLists.length} lists`)
  return { imported: totalImported }
}

async function exportToMicrosoft(supabaseClient: any, userId: string, accessToken: string) {
  console.log('Starting export to Microsoft...')
  
  // Get tasks that need to be exported (modified since last sync, no external_id)
  const { data: localTasks } = await supabaseClient
    .from('tasks')
    .select('*, projects(name)')
    .eq('user_id', userId)
    .or('external_id.is.null,microsoft_last_modified.is.null')

  if (!localTasks || localTasks.length === 0) {
    console.log('No tasks to export')
    return { exported: 0, conflictsResolved: 0 }
  }

  // Get all Microsoft ToDo lists
  const listsResponse = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!listsResponse.ok) {
    throw new Error('Failed to get Microsoft ToDo lists')
  }

  const listsData = await listsResponse.json()
  const existingLists = listsData.value || []
  
  // Create a map of list names to list IDs
  const listMap = new Map()
  existingLists.forEach(list => {
    listMap.set(list.displayName.toLowerCase(), list.id)
  })

  let exportedCount = 0
  let conflictsResolved = 0

  for (const task of localTasks) {
    try {
      // Determine which list this task should go to
      let targetListId = null
      let targetListName = 'Tasks' // Default list name

      // If task has a project, try to find/create corresponding list
      if (task.projects && task.projects.name) {
        targetListName = task.projects.name
        targetListId = listMap.get(targetListName.toLowerCase())

        // If list doesn't exist, create it
        if (!targetListId) {
          const createListResponse = await fetch('https://graph.microsoft.com/v1.0/me/todo/lists', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              displayName: targetListName
            })
          })

          if (createListResponse.ok) {
            const newList = await createListResponse.json()
            targetListId = newList.id
            listMap.set(targetListName.toLowerCase(), targetListId)
            console.log(`Created new Microsoft ToDo list: ${targetListName}`)
          }
        }
      }

      // Fallback to default list if no specific list found
      if (!targetListId) {
        const defaultList = existingLists.find(list => list.wellknownListName === 'defaultList') || existingLists[0]
        targetListId = defaultList?.id
      }

      if (!targetListId) {
        console.error(`No target list found for task: ${task.title}`)
        continue
      }

      const microsoftTask = {
        title: task.title,
        body: {
          content: task.description || '',
          contentType: 'text'
        },
        importance: task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'normal',
        status: task.completed ? 'completed' : task.status === 'in-progress' ? 'inProgress' : 'notStarted',
        dueDateTime: task.due_date ? {
          dateTime: task.due_date,
          timeZone: 'UTC'
        } : undefined
      }

      let microsoftTaskId = task.external_id
      let method = 'POST'
      let url = `https://graph.microsoft.com/v1.0/me/todo/lists/${targetListId}/tasks`

      // If task already has external_id, update it
      if (microsoftTaskId) {
        method = 'PATCH'
        url = `https://graph.microsoft.com/v1.0/me/todo/lists/${targetListId}/tasks/${microsoftTaskId}`
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(microsoftTask)
      })

      if (response.ok) {
        const createdTask = await response.json()
        
        // Update local task with Microsoft ID
        await supabaseClient
          .from('tasks')
          .update({ 
            external_id: createdTask.id,
            external_source: 'microsoft_todo',
            microsoft_last_modified: createdTask.lastModifiedDateTime
          })
          .eq('id', task.id)

        exportedCount++
        console.log(`Exported task: ${task.title} to list: ${targetListName}`)
      } else {
        console.error(`Failed to export task ${task.title}: ${response.statusText}`)
      }
    } catch (error) {
      console.error(`Error exporting task ${task.title}:`, error)
    }
  }

  console.log(`Export completed: ${exportedCount} tasks exported`)
  return { exported: exportedCount, conflictsResolved }
}

// Helper function to generate random colors for new projects
function getRandomColor() {
  const colors = [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
