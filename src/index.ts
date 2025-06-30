#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import our service modules
import { GitHubService } from './services/github';
import { NotionService } from './services/notion';
import { GoogleCalendarService } from './services/google-calendar';
import { WebSearchService } from './services/web-search';
import { ContentWorkflowService } from './services/content-workflow';

// Initialize services
const githubService = new GitHubService();
const notionService = new NotionService();
const calendarService = new GoogleCalendarService();
const webSearchService = new WebSearchService();
const workflowService = new ContentWorkflowService(
  githubService,
  notionService,
  calendarService,
  webSearchService
);

// Define our tools
const tools: Tool[] = [
  // GitHub Tools
  {
    name: 'github_create_issue',
    description: 'Create a new GitHub issue for content development',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue description' },
        labels: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Labels to apply to the issue'
        }
      },
      required: ['title', 'body']
    }
  },
  {
    name: 'github_create_branch',
    description: 'Create a new branch for content development',
    inputSchema: {
      type: 'object',
      properties: {
        branchName: { type: 'string', description: 'Name of the new branch' },
        baseBranch: { type: 'string', description: 'Base branch to create from', default: 'main' }
      },
      required: ['branchName']
    }
  },
  {
    name: 'github_create_pull_request',
    description: 'Create a pull request for content changes',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'PR title' },
        body: { type: 'string', description: 'PR description' },
        head: { type: 'string', description: 'Source branch' },
        base: { type: 'string', description: 'Target branch', default: 'main' }
      },
      required: ['title', 'body', 'head']
    }
  },

  // Notion Tools
  {
    name: 'notion_create_page',
    description: 'Create a new page in Notion for content planning',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Page title' },
        content: { type: 'string', description: 'Page content in markdown' },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Tags for categorization'
        }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'notion_search_pages',
    description: 'Search for pages in Notion database',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        filter: { type: 'string', description: 'Filter by status, tags, etc.' }
      },
      required: ['query']
    }
  },
  {
    name: 'notion_update_page',
    description: 'Update an existing Notion page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Notion page ID' },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New content' },
        status: { type: 'string', description: 'Content status (draft, review, published)' }
      },
      required: ['pageId']
    }
  },

  // Google Calendar Tools
  {
    name: 'calendar_create_event',
    description: 'Create a calendar event for content deadlines',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        description: { type: 'string', description: 'Event description' },
        startTime: { type: 'string', description: 'Start time (ISO string)' },
        endTime: { type: 'string', description: 'End time (ISO string)' },
        attendees: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Email addresses of attendees'
        }
      },
      required: ['title', 'startTime', 'endTime']
    }
  },
  {
    name: 'calendar_list_events',
    description: 'List upcoming calendar events',
    inputSchema: {
      type: 'object',
      properties: {
        timeMin: { type: 'string', description: 'Start time for search (ISO string)' },
        timeMax: { type: 'string', description: 'End time for search (ISO string)' },
        maxResults: { type: 'number', description: 'Maximum number of events to return', default: 10 }
      }
    }
  },

  // Web Search Tools
  {
    name: 'web_search',
    description: 'Search the web for content research',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Maximum number of results', default: 5 }
      },
      required: ['query']
    }
  },
  {
    name: 'web_extract_content',
    description: 'Extract content from a specific URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to extract content from' }
      },
      required: ['url']
    }
  },

  // Workflow Tools
  {
    name: 'workflow_create_content_plan',
    description: 'Create a complete content plan with research, tasks, and deadlines',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Content topic' },
        contentType: { type: 'string', description: 'Type of content (blog, video, etc.)' },
        deadline: { type: 'string', description: 'Deadline (ISO string)' },
        assignee: { type: 'string', description: 'Person responsible for the content' }
      },
      required: ['topic', 'contentType', 'deadline']
    }
  },
  {
    name: 'workflow_publish_content',
    description: 'Complete the publishing workflow for content',
    inputSchema: {
      type: 'object',
      properties: {
        contentId: { type: 'string', description: 'Content ID from Notion' },
        repository: { type: 'string', description: 'GitHub repository name' },
        branch: { type: 'string', description: 'Branch to create for changes' }
      },
      required: ['contentId', 'repository']
    }
  },
  {
    name: 'workflow_research_topic',
    description: 'Research a topic and create a comprehensive summary',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to research' },
        depth: { type: 'string', description: 'Research depth (basic, comprehensive)', default: 'comprehensive' }
      },
      required: ['topic']
    }
  }
];

// Create and start the server
const server = new Server(
  {
    name: 'content-workflow-mcp-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool calls
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // GitHub tools
      case 'github_create_issue':
        return await githubService.createIssue(args);
      case 'github_create_branch':
        return await githubService.createBranch(args);
      case 'github_create_pull_request':
        return await githubService.createPullRequest(args);

      // Notion tools
      case 'notion_create_page':
        return await notionService.createPage(args);
      case 'notion_search_pages':
        return await notionService.searchPages(args);
      case 'notion_update_page':
        return await notionService.updatePage(args);

      // Google Calendar tools
      case 'calendar_create_event':
        return await calendarService.createEvent(args);
      case 'calendar_list_events':
        return await calendarService.listEvents(args);

      // Web search tools
      case 'web_search':
        return await webSearchService.search(args);
      case 'web_extract_content':
        return await webSearchService.extractContent(args);

      // Workflow tools
      case 'workflow_create_content_plan':
        return await workflowService.createContentPlan(args);
      case 'workflow_publish_content':
        return await workflowService.publishContent(args);
      case 'workflow_research_topic':
        return await workflowService.researchTopic(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
});

// Start the server
const transport = new StdioServerTransport();
(async () => {
  await server.connect(transport);
  console.error('Content Workflow MCP Server started');
})(); 