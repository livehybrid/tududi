# tududi REST API Specification

This document describes the RESTful endpoints exposed by the **tududi** platform for programmatic access by AI clients and other third‑party consumers.  The API mirrors all functionality available in the web UI while preserving tududi's focus on privacy, user control and efficiency.

- **Base URL:** `https://{host}/api/v1`
- **Content Type:** `application/json`
- **Authentication:** Token based (see below). All endpoints, except authentication, require the `Authorization: Bearer <token>` header.
- **Versioning:** The path includes a version (`/v1/`). Breaking changes will increment the version number.
- **Rate limiting:** Default 60 requests/minute per token. 429 is returned when exceeded with `Retry-After` and `Rate-Limit-Remaining` headers.

## Authentication

### `POST /auth/token`
Exchange user credentials for an access token and refresh token.

Request body:
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Successful response `200`:
```json
{
  "access_token": "<JWT>",
  "expires_in": 900,
  "refresh_token": "<opaque>",
  "token_type": "Bearer"
}
```

Errors: `400` invalid request, `401` invalid credentials.

### `POST /auth/refresh`
Refresh an expired access token using a refresh token.

Request body:
```json
{
  "refresh_token": "<opaque>"
}
```

Response `200`:
```json
{
  "access_token": "<JWT>",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

Errors: `400` invalid request, `401` invalid token.

### `POST /auth/revoke`
Invalidate an access or refresh token.

Request body:
```json
{
  "token": "<JWT or opaque>"
}
```

Response `204` with empty body on success.

---

## Common Query Parameters
- `page` and `per_page` for pagination (defaults: page=1, per_page=50, max=100).
- `sort` field name and `order` (asc|desc).

## Error Format
Errors use a consistent envelope:
```json
{
  "error": {
    "code": "not_found",
    "message": "Task not found"
  }
}
```

## Entities

### Areas
**Resource path:** `/areas`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/areas` | List areas for current user. |
| `POST` | `/areas` | Create area. |
| `GET` | `/areas/{id}` | Retrieve single area. |
| `PUT` | `/areas/{id}` | Update area. |
| `DELETE` | `/areas/{id}` | Delete area. Only allowed if it has no projects. |

**Area object**
```json
{
  "id": 123,
  "name": "Personal",
  "description": "Optional description"
}
```

### Projects
**Resource path:** `/projects`

Projects belong to an Area.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/projects` | List projects. Filter by `area_id`. |
| `POST` | `/projects` | Create project (requires `area_id`). |
| `GET` | `/projects/{id}` | Retrieve project. |
| `PUT` | `/projects/{id}` | Update project details or move to another area. |
| `DELETE` | `/projects/{id}` | Delete project. Tasks and notes must be handled beforehand. |

**Project object**
```json
{
  "id": 12,
  "area_id": 123,
  "name": "Work",
  "description": null,
  "status": "active"
}
```

### Tasks
**Resource path:** `/tasks`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/tasks` | List tasks. Supports filters: `project_id`, `status`, `tag`, `due_before`, `due_after`. |
| `POST` | `/tasks` | Create task. Optional `project_id` and `tags`. |
| `GET` | `/tasks/{id}` | Retrieve task with subtasks, tags and project. |
| `PUT` | `/tasks/{id}` | Update task attributes, assign tags or move to project. |
| `DELETE` | `/tasks/{id}` | Delete task. |
| `POST` | `/tasks/{id}/complete` | Mark task as done. |
| `POST` | `/tasks/{id}/subtasks` | Create a subtask. |

**Task object**
```json
{
  "id": 42,
  "project_id": 12,
  "name": "Prepare report",
  "description": null,
  "due_date": "2024-12-24",
  "priority": 1,
  "status": "open",
  "tags": ["finance", "urgent"],
  "subtasks": []
}
```

### Notes
**Resource path:** `/notes`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/notes` | List notes. Filter by `project_id` or `tag`. |
| `POST` | `/notes` | Create note. |
| `GET` | `/notes/{id}` | Retrieve note. |
| `PUT` | `/notes/{id}` | Update note. |
| `DELETE` | `/notes/{id}` | Delete note. |

**Note object**
```json
{
  "id": 55,
  "project_id": 12,
  "title": "Idea",
  "content": "Markdown content...",
  "tags": ["research"]
}
```

### Tags
**Resource path:** `/tags`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/tags` | List tags for the user. Include counts of associated tasks/notes. |
| `POST` | `/tags` | Create tag. |
| `GET` | `/tags/{id}` | Retrieve tag with associated resources. |
| `PUT` | `/tags/{id}` | Rename tag. |
| `DELETE` | `/tags/{id}` | Delete tag. Optionally with `?force=true` to remove relationships. |

**Tag object**
```json
{
  "id": 7,
  "name": "urgent",
  "task_count": 3,
  "note_count": 1
}
```

### Users
**Resource path:** `/users`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/users/me` | Get profile of current user. |
| `PUT` | `/users/me` | Update profile (language, timezone, appearance, etc.). |
| `POST` | `/users` | Register new user (if self‑registration enabled). |
| `DELETE` | `/users/me` | Permanently delete account and all data. |

### Miscellaneous
- `/task-events` – retrieve historical events for a task.
- `/inbox` – access unprocessed tasks and notes.
- `/search` – full‑text search across tasks, notes and projects.

---

## Security Considerations
- All traffic must use HTTPS.
- Tokens are scoped to a single user and cannot be used to access other users' data.
- Refresh tokens are long‑lived, stored securely server‑side, and can be revoked individually.
- Implement IP‑based rate limiting and logging to detect abuse.

## Status Codes
- `200` – Success with body.
- `201` – Resource created.
- `204` – Success with no body.
- `400` – Bad request/validation errors.
- `401` – Authentication required or failed.
- `403` – Authenticated but not allowed.
- `404` – Resource not found.
- `409` – Conflict/duplicate.
- `422` – Unprocessable entity (semantic errors).
- `429` – Rate limit exceeded.
- `500` – Internal server error.

## Webhooks (Optional)
Clients may register webhook URLs via `POST /webhooks` to receive real‑time notifications for task, project or note changes. Each webhook delivery includes an HMAC signature in the `X-Tududi-Signature` header derived from the user's secret.

## MCP SSE Interface
To support event-driven interactions, tududi exposes a Server-Sent Events (SSE) endpoint that implements the Machine Collaboration Protocol (MCP). All requests require the same bearer token used for REST calls.

### `GET /mcp/stream`
Establish an SSE stream. Clients send `Accept: text/event-stream` and the server replies with `Content-Type: text/event-stream`, keeping the connection open. Events conform to the MCP format:

```
event: message
data: {"id":"42","type":"task.created","payload":{"id":42,"name":"Prepare report"}}

event: ping
data: {}
```

Reconnects may use the `Last-Event-ID` header or `last_event_id` query parameter.

### `POST /mcp/messages`
Send an MCP message to the server (e.g., create task, update project). The JSON body must include `id`, `type` and `payload` fields. The server responds `202 Accepted` and emits resulting messages on the SSE stream. Error responses use the standard error envelope.

### Connection management
- Server emits `event: ping` every 30 seconds to keep the stream alive.
- Clients close the stream by terminating the request or sending `DELETE /mcp/stream`.
- Rate limits identical to REST endpoints apply to `POST /mcp/messages`; the open SSE stream counts as one active request.

## Changelog
- `v1` – Initial version.
