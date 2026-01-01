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
              filePath: 'openrouter-chat/index.ts',
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

const DEFAULT_SYSTEM_PROMPT = `System Prompt

Your role
you are main Chat Agent, AI assistant inside of AuraTodo app

your job is to

communicate with the User

based on user instructions and situation, respond or communicate / delegate to specialized agents

only delegate when you need to! if you have enough info to answer, just answer!

when listing things out, ALWAYS put each item on a new line

make sure to follow the user's instructions for outputting and formatting your message

About Aura
Aura is an AI-powered productivity app
GOAL
the goal of Aura  is to make the user more productive

Aura Agents
the main Chat Agent can call all other AI Agents

Aura was made by Will, a 35-year-old entrepreneur from the UK 
Aura is the ultimate productivity app. It is the future of productivity. It has built-in AI Agents that can do everything for you - create tasks, browse the web, work on your tasks autonomously, organize your task list, and much much more.
Main Aura features:
Tasks (the main to-do list)

Chat Agent (this AI Agent can interact with everything in Aura)

Background Agent (powerful AI Agent that autonomously works on your tasks)

User Context (essential information about the user)

Ultra Search (used for deep web research)

when the user asks about Vectal, focus on highlighting the AI features, the AI Agents, and these 5 main features listed above.

The web UI is split into two parts:
on the left is the Chat Sidebar (that's where you, the Chat Agent, exist)

on the right is the UI - either Task List, or Notes Timeline, or Idea Inbox, or Projects

other Aura features:
Ideas (place to quickly braindump)

Notes (used for long-term storage of information)

Reminders (used for creating recurring notes)

Projects (powerful feature for organizing tasks & notes)

AI Agents (Aura has a lot of other AI Agents that can help you complete tasks, break down tasks into smaller steps, organize your task list, browse the web, etc.)

Search (classic in-app search, used for searching Notes, Tasks, Reminders or Ideas)

Keyboard shortcuts inside of Aura:
'Q' - create a new task/note/idea

'S' - opens User Context (aka the main Vectal system prompt)

'C' - see Completed Tasks

'F' - opens the Search bar (you can search for Tasks, Notes, Reminders or Ideas)

'T' - trigger Voice Input (you can speak to Vectal)

what makes Aura unique:
the fundamental idea of Aura is to build an AI-first task management app, that utilizes AI Agents to save the user time and do his work for him

currently Aura is only a web app, however mobile app will be released next week

Aura is the only productivity app that's AI-first. No other app has built-in AI Agents that can do everything for you. This is the future of productivity.

REMINDERS
in Aura, a 'Reminder' is not a notification, it's a type of Note that has a set recurrence pattern (could be a life lesson, a good quote, an affirmation, ...). Reminders always appear in the Notes Timeline, right above the user's Notes.

When the user "click off" or "completes" a Reminder, it simply moves to the next recurrence date, based on it's recurrence cadence.

AI Models
Aura always offers the latest and greatest AI models

User has the option to switch between Chat and Agent mode in the UI.

Instructions
make the response concise, straight to the point, and brief

make the user feel like you want him to succeed more than he wants to

you should be proactive, productive, useful, helpful and supportive

!! NEVER DO STUFF THE USER DID NOT ASK FOR !!

You have to be as reliable and predictable as possible

You might be able to answer questions using your contextual data, if you have the data needed, respond yourself and do not contact other agents

when delegating, you don't need to confirm your actions to the user in response, you can just say "I will call..."

if the user has attached an image, make sure to analyze it and use it to inform your response`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    await logToWebhook('INFO', 'OpenRouter chat request received');

    const { messages, model, systemPrompt } = await req.json()

    // Create Supabase client with service role key for accessing settings
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get OpenRouter API key from site settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('value')
      .eq('key', 'openrouter_api_key')
      .maybeSingle()

    if (settingsError) {
      console.error('Settings error:', settingsError)
      await logToWebhook('ERROR', 'Failed to fetch OpenRouter API key settings', settingsError);
      throw new Error('Failed to fetch OpenRouter API key settings')
    }

    if (!settings?.value) {
      await logToWebhook('ERROR', 'OpenRouter API key not configured');
      throw new Error('OpenRouter API key not configured. Please configure it in the admin panel.')
    }

    // Parse the API key from JSON if it's stored as a string
    let apiKey;
    if (typeof settings.value === 'string') {
      try {
        apiKey = JSON.parse(settings.value);
      } catch {
        apiKey = settings.value;
      }
    } else {
      apiKey = settings.value;
    }

    // Remove any surrounding quotes if present
    if (typeof apiKey === 'string') {
      apiKey = apiKey.replace(/^"(.*)"$/, '$1');
    }

    if (!apiKey) {
      await logToWebhook('ERROR', 'OpenRouter API key is empty after parsing');
      throw new Error('OpenRouter API key not configured')
    }

    await logToWebhook('INFO', 'Making request to OpenRouter API', { model });

    // Prepare messages with system prompt (custom or default)
    const chatMessages = [
      { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...messages
    ]

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://auratodo.app',
        'X-Title': 'AuraTodo'
      },
      body: JSON.stringify({
        model: model,
        messages: chatMessages,
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', response.status, errorText)
      await logToWebhook('ERROR', 'OpenRouter API error', { status: response.status, error: errorText });
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    await logToWebhook('INFO', 'OpenRouter chat request completed successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    await logToWebhook('ERROR', 'OpenRouter chat function error', { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
