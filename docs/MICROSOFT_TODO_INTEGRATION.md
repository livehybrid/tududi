# Microsoft ToDo Integration

This document describes the Microsoft ToDo integration feature in Tududi, which allows users to import and sync tasks between Tududi and Microsoft ToDo.

## Features

- **Import Tasks**: Import tasks from Microsoft ToDo lists into Tududi projects
- **Export Tasks**: Export Tududi tasks to Microsoft ToDo lists
- **Two-way Sync**: Bidirectional synchronization between both platforms
- **Automatic Mapping**: Smart mapping between Microsoft ToDo lists and Tududi projects
- **Priority & Status Mapping**: Automatic conversion of priority levels and task statuses
- **OAuth Authentication**: Secure Microsoft Graph API authentication

## Setup

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Microsoft ToDo Integration
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3002/auth/microsoft/callback
```

### Microsoft App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in the application details:
   - Name: "Tududi Microsoft ToDo Integration"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:3002/auth/microsoft/callback` (for development)
5. After creation, note down the "Application (client) ID" and create a client secret
6. In "API permissions", add the following Microsoft Graph permissions:
   - `Tasks.ReadWrite` (Delegated)
   - `offline_access` (Delegated)
7. Grant admin consent for the permissions

## Data Mapping

### Microsoft ToDo → Tududi

| Microsoft ToDo | Tududi | Notes |
|----------------|--------|-------|
| `title` | `name` | Task name |
| `body.content` | `description` | Task description |
| `status` | `status` | `completed` → `done`, `inProgress` → `in_progress`, `notStarted` → `not_started` |
| `importance` | `priority` | `high` → `2`, `normal` → `1`, `low` → `0` |
| `dueDateTime` | `due_date` | Due date and time |
| `lastModifiedDateTime` | `external_last_modified` | For sync tracking |
| `id` | `external_id` | Microsoft task ID for tracking |
| Lists | `projects` | Microsoft lists become Tududi projects |

### Tududi → Microsoft ToDo

| Tududi | Microsoft ToDo | Notes |
|--------|----------------|-------|
| `name` | `title` | Task name |
| `description` | `body.content` | Task description |
| `status` | `status` | `done` → `completed`, `in_progress` → `inProgress`, `not_started` → `notStarted` |
| `priority` | `importance` | `2` → `high`, `1` → `normal`, `0` → `low` |
| `due_date` | `dueDateTime` | Due date and time |
| `projects` | Lists | Tududi projects become Microsoft lists |

## Usage

1. Navigate to **Profile Settings** > **Integrations** tab
2. Click **Connect to Microsoft ToDo**
3. Authorize the application in the Microsoft OAuth flow
4. Use the available actions:
   - **Import Tasks**: Import tasks from Microsoft ToDo to Tududi
   - **Export Tasks**: Export Tududi tasks to Microsoft ToDo
   - **Two-way Sync**: Perform bidirectional synchronization
   - **Disconnect**: Remove the Microsoft ToDo connection

## API Endpoints

- `GET /api/microsoft-todo/auth-url` - Get Microsoft OAuth authorization URL
- `POST /api/microsoft-todo/exchange-token` - Exchange authorization code for access token
- `POST /api/microsoft-todo/refresh-token` - Refresh access token
- `GET /api/microsoft-todo/lists` - Get Microsoft ToDo lists
- `POST /api/microsoft-todo/import` - Import tasks from Microsoft ToDo
- `POST /api/microsoft-todo/export` - Export tasks to Microsoft ToDo
- `POST /api/microsoft-todo/sync` - Bidirectional sync
- `DELETE /api/microsoft-todo/disconnect` - Disconnect from Microsoft ToDo
- `GET /api/microsoft-todo/status` - Get connection status

## Security

- OAuth 2.0 authentication with Microsoft Graph API
- Access tokens are stored in server-side sessions
- Automatic token refresh to maintain connectivity
- No sensitive data is stored in the database

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Ensure the Microsoft app registration is configured correctly and the redirect URI matches
2. **Permission Denied**: Verify that the required Microsoft Graph permissions are granted
3. **Token Expired**: The system automatically refreshes tokens, but you may need to reconnect if refresh fails
4. **Sync Issues**: Check that tasks have proper project associations for export functionality

### Logs

Check the application logs for detailed error messages related to Microsoft ToDo integration. Look for entries with the prefix "Microsoft ToDo" or "microsoft-todo".

## Development

The integration consists of:

- **Backend Service**: `backend/services/microsoftTodoService.js`
- **API Routes**: `backend/routes/microsoft-todo.js`
- **OAuth Callback**: `backend/routes/microsoft-auth.js`
- **Frontend Component**: `frontend/components/MicrosoftTodoImport.tsx`
- **Configuration**: Added to `backend/config/config.js`

## Future Enhancements

- Automatic background synchronization
- Conflict resolution for simultaneous edits
- Bulk import/export operations
- Custom field mapping
- Integration with other Microsoft services (Outlook, Teams)
