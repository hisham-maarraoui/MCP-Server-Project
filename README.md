# Content Workflow MCP Server

A Model Context Protocol (MCP) server that automates content management and publishing workflows by integrating GitHub, Notion, and Google Calendar.

## Overview

This MCP server combines the following tools/services:

1. **GitHub** - Repository management, issue tracking, and pull request automation
2. **Notion** - Content planning, documentation, and project management
3. **Google Calendar** - Deadline management and milestone scheduling

## Features

### Workflow Automation

- **Content Planning**: Automated planning and task creation
- **Development Tracking**: GitHub issues and branches for content development
- **Deadline Management**: Calendar events and milestone tracking
- **Publishing Pipeline**: Automated pull requests and status updates

### Tool Capabilities

#### GitHub Integration

- Create issues for content development tracking
- Create branches for content updates
- Create pull requests for publishing

#### Notion Integration

- Create content planning pages
- Search and filter existing pages
- Update page content and status
- Manage content database

#### Google Calendar Integration

- Create deadline and milestone events
- List upcoming events

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys for the integrated services

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd content-workflow-mcp-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` with your API keys:

   ```env
   # GitHub Configuration
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_OWNER=your_github_username
   GITHUB_REPO=your_repository_name

   # Notion Configuration
   NOTION_TOKEN=your_notion_integration_token
   NOTION_DATABASE_ID=your_notion_database_id

   # Google Calendar Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## API Key Setup

### GitHub

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` and `issues` permissions
3. Add to `.env` as `GITHUB_TOKEN`

### Notion

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the token and add to `.env` as `NOTION_TOKEN`
4. Share your Notion database with the integration
5. Copy the database ID from the URL and add to `.env` as `NOTION_DATABASE_ID`

### Google Calendar

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add client ID and secret to `.env`

## Usage

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### MCP Client Configuration

Add this to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "content-workflow": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token",
        "NOTION_TOKEN": "your_token",
        "NOTION_DATABASE_ID": "your_database_id"
      }
    }
  }
}
```

## Available Tools

### Workflow Tools

#### `workflow_create_content_plan`

Creates a complete content plan with research, tasks, and deadlines.

**Parameters:**

- `topic` (string, required): Content topic
- `contentType` (string, required): Type of content (blog, video, etc.)
- `deadline` (string, required): Deadline (ISO string)
- `assignee` (string, optional): Person responsible

#### `workflow_publish_content`

Completes the publishing workflow for content.

**Parameters:**

- `contentId` (string, required): Content ID from Notion
- `repository` (string, required): GitHub repository name
- `branch` (string, optional): Branch to create for changes

#### `workflow_research_topic`

Researches a topic and creates a summary.

**Parameters:**

- `topic` (string, required): Topic to research
- `depth` (string, optional): Research depth (basic, comprehensive)

### GitHub Tools

#### `github_create_issue`

Creates a new GitHub issue for content development.

#### `github_create_branch`

Creates a new branch for content development.

#### `github_create_pull_request`

Creates a pull request for content changes.

### Notion Tools

#### `notion_create_page`

Creates a new page in Notion for content planning.

#### `notion_search_pages`

Search for pages in Notion database.

#### `notion_update_page`

Update an existing Notion page.

### Google Calendar Tools

#### `calendar_create_event`

Creates a calendar event for content deadlines.

#### `calendar_list_events`

Lists upcoming calendar events.

## Monitoring & Logging

The server includes comprehensive logging:

- Tool execution logs
- Error tracking
- Performance metrics
- Authentication status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the documentation
2. Open an issue on GitHub

## Future Enhancements

- [ ] Slack integration for notifications
- [ ] Content analytics and performance tracking
- [ ] Multi-language support
- [ ] Advanced content validation
- [ ] Automated SEO optimization
- [ ] Social media publishing integration
- [ ] Content performance analytics
- [ ] Team collaboration features
