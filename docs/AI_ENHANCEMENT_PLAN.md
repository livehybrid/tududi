# AI Enhancement Plan for Tududi

## Existing Architecture Overview

- **Backend**: Express.js with Sequelize ORM. Core data models include tasks, projects, areas, notes, tags, and calendar tokens.
- **Task model** links tasks to users and projects while tracking priority, status, recurrence, and other metadata.
- **Project model** organizes tasks under user-owned projects and areas.
- **Calendar tokens** store user credentials for external calendar providers.
- **Scheduler infrastructure** uses `node-cron` to process summaries and recurring tasks.
- **Frontend**: React + TypeScript with webpack, providing task/project management UI and collaboration features.

## Phase 1 – Background Research Agent & Email Integration

### OpenAI-compatible API Configuration

1. Introduce environment variables for OpenRouter endpoint, API key, and default model.
2. Extend per-user preferences to include selected model, temperature, and API credentials stored encrypted at rest.
3. Create a configurable OpenRouter client in the backend, reusing existing config patterns.

### Research Job Data Model & Services

1. Add `ResearchJob` table with fields: `id`, `user_id`, `task_id`, `query`, `status`, `result`, `error`, `email_sent`, timestamps.
2. Service layer (`researchService`) to:
   - enqueue jobs and run asynchronously via worker (BullMQ or existing scheduler).
   - perform web/API research, summarize results via LLM, and persist findings.
   - link results back to tasks (e.g., attach summary note or create follow-up tasks).
3. Expose REST endpoints for job creation, status polling, and result retrieval.

### Background Processing

1. Extend scheduler infrastructure or integrate BullMQ to manage research job queue.
2. Provide status updates and notifications when jobs complete.
3. Respect `DISABLE_SCHEDULER` flag for environments where background work should be disabled.

### Email Integration via MCP

1. Implement `EmailService` that supports SMTP/IMAP or OAuth-based Gmail/Outlook connections.
2. Use Model Context Protocol (MCP) to expose email actions: `sendEmail`, `listThreads`, `fetchMessage`.
3. Store per-user email account tokens encrypted; allow configuration for auto-send vs. manual review.
4. Allow research agent to automatically email summaries or follow-ups when configured.

### Security & Privacy

- Encrypt all API keys and tokens at rest.
- Maintain audit logs of agent activity and external calls.
- Require explicit user consent before any external research or email action.

### UI/UX

- Settings page for managing API keys, model preferences, and email accounts.
- “Research” action on tasks/projects showing job progress and results.
- Option to automatically email stakeholders when research completes.

## Phase 2 – Chat-to-Task Conversion

### Conversational Interface

1. Add chat component storing conversation history with OpenRouter-powered dialog understanding.
2. Implement `ChatSession` and `Message` tables for context persistence (with opt-out controls).

### Task Extraction Workflow

1. LLM interprets user chat and proposes structured tasks (title, due date, tags, project).
2. User approves/edits tasks before they are saved using existing task model.
3. Optional automatic creation of research jobs for tasks requiring information gathering.

### Architecture & Privacy

- Service managing conversation ➜ task mapping with configurable prompts.
- Allow users to limit or delete stored conversation history.

## Phase 3 – Intelligent Suggestions, Calendar Integration & Content Agents

### Intelligent Project Suggestions

- Analyze existing tasks/projects (tags, due dates, areas) to propose new project templates or follow-up tasks.
- Use LLM plus research outputs to recommend next steps.

### Calendar Integration via MCP

- Connect Google/Outlook calendars using existing `CalendarToken` model.
- Agents can check availability, schedule events, and sync due dates with calendars.

### Content Creation Agents

- Generate draft emails, notes, or blog posts from research findings and project context.
- Drafts saved as notes or attachments for user review before sending/publishing.

### Recommendation Engine

- Background service analyzes local usage patterns to propose recurring tasks or productivity tips without sharing data externally.

## Implementation Roadmap Summary

1. **Phase 1**: configurable OpenRouter client, `ResearchJob` model & worker, MCP-based `EmailService`, UI hooks.
2. **Phase 2**: chat infrastructure, conversation storage, LLM task parser, user approval flow.
3. **Phase 3**: project suggestion logic, MCP calendar provider, content generation utilities.

This phased approach prioritizes automated research and email workflows to deliver immediate productivity gains while preserving Tududi’s privacy-first design.

