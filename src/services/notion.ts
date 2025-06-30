import { Client } from '@notionhq/client';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const NotionConfigSchema = z.object({
  token: z.string(),
  databaseId: z.string(),
});

export class NotionService {
  private client: Client;
  private config: z.infer<typeof NotionConfigSchema>;

  constructor() {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!token || !databaseId) {
      throw new Error('Notion configuration missing. Please set NOTION_TOKEN and NOTION_DATABASE_ID environment variables.');
    }

    this.config = NotionConfigSchema.parse({ token, databaseId });
    this.client = new Client({ auth: token });
  }

  async createPage(args: any) {
    const schema = z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
    });

    const { title, content, tags = [] } = schema.parse(args);

    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.config.databaseId },
        properties: {
          'Title': {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
          'Status': {
            select: {
              name: 'Draft',
            },
          },
          'Tags': {
            multi_select: tags.map(tag => ({ name: tag })),
          },
          'Created Date': {
            date: {
              start: new Date().toISOString(),
            },
          },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content,
                  },
                },
              ],
            },
          },
        ],
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Notion page created successfully!\n\n**Title**: ${title}\n\n**Page ID**: ${response.id}\n\n**URL**: https://notion.so/${response.id.replace(/-/g, '')}\n\n**Status**: Draft\n\n**Tags**: ${tags.join(', ') || 'None'}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error creating Notion page:', error);
      throw new Error(`Failed to create Notion page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchPages(args: any) {
    const schema = z.object({
      query: z.string(),
      filter: z.string().optional(),
    });

    const { query, filter } = schema.parse(args);

    try {
      const response = await this.client.search({
        query,
        filter: {
          property: 'object',
          value: 'page',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      });

      const pages = response.results
        .filter((page: any) => page.parent?.database_id === this.config.databaseId)
        .map((page: any) => ({
          id: page.id,
          title: page.properties?.Title?.title?.[0]?.text?.content || 'Untitled',
          status: page.properties?.Status?.select?.name || 'Unknown',
          tags: page.properties?.Tags?.multi_select?.map((tag: any) => tag.name) || [],
          url: page.url,
          lastEdited: page.last_edited_time,
        }));

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Found ${pages.length} pages matching "${query}":\n\n${pages.map(page => 
              `• **${page.title}**\n  Status: ${page.status}\n  Tags: ${page.tags.join(', ') || 'None'}\n  URL: ${page.url}\n  Last edited: ${new Date(page.lastEdited).toLocaleDateString()}`
            ).join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error searching Notion pages:', error);
      throw new Error(`Failed to search Notion pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePage(args: any) {
    const schema = z.object({
      pageId: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(['Draft', 'Review', 'Published']).optional(),
    });

    const { pageId, title, content, status } = schema.parse(args);

    try {
      const updateData: any = {};

      if (title) {
        updateData.properties = {
          ...updateData.properties,
          'Title': {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        };
      }

      if (status) {
        updateData.properties = {
          ...updateData.properties,
          'Status': {
            select: {
              name: status,
            },
          },
        };
      }

      const response = await this.client.pages.update({
        page_id: pageId,
        ...updateData,
      });

      // If content is provided, add it as a new block
      if (content) {
        await this.client.blocks.children.append({
          block_id: pageId,
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: content,
                    },
                  },
                ],
              },
            },
          ],
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Notion page updated successfully!\n\n**Page ID**: ${pageId}\n\n**URL**: https://notion.so/${pageId.replace(/-/g, '')}\n\n${title ? `**New Title**: ${title}\n\n` : ''}${status ? `**New Status**: ${status}\n\n` : ''}${content ? '**Content added**\n\n' : ''}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error updating Notion page:', error);
      throw new Error(`Failed to update Notion page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPage(args: any) {
    const schema = z.object({
      pageId: z.string(),
    });

    const { pageId } = schema.parse(args);

    try {
      const response = await this.client.pages.retrieve({
        page_id: pageId,
      });

      const blocks = await this.client.blocks.children.list({
        block_id: pageId,
      });

      const content = blocks.results
        .map((block: any) => {
          if (block.type === 'paragraph') {
            return block.paragraph.rich_text.map((text: any) => text.text.content).join('');
          }
          return '';
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📄 **Page Details**\n\n**Title**: ${(response as any).properties?.Title?.title?.[0]?.text?.content || 'Untitled'}\n\n**Status**: ${(response as any).properties?.Status?.select?.name || 'Unknown'}\n\n**Tags**: ${(response as any).properties?.Tags?.multi_select?.map((tag: any) => tag.name).join(', ') || 'None'}\n\n**URL**: ${(response as any).url}\n\n**Content**:\n${content}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting Notion page:', error);
      throw new Error(`Failed to get Notion page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listDatabasePages(args: any = {}) {
    const schema = z.object({
      status: z.string().optional(),
      limit: z.number().default(10),
    });

    const { status, limit } = schema.parse(args);

    try {
      const response = await this.client.databases.query({
        database_id: this.config.databaseId,
        filter: status ? {
          property: 'Status',
          select: {
            equals: status,
          },
        } : undefined,
        page_size: limit,
        sorts: [
          {
            property: 'Created Date',
            direction: 'descending',
          },
        ],
      });

      const pages = response.results.map((page: any) => ({
        id: page.id,
        title: page.properties?.Title?.title?.[0]?.text?.content || 'Untitled',
        status: page.properties?.Status?.select?.name || 'Unknown',
        tags: page.properties?.Tags?.multi_select?.map((tag: any) => tag.name) || [],
        url: page.url,
        createdDate: page.properties?.['Created Date']?.date?.start,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `📋 Database pages${status ? ` with status "${status}"` : ''}:\n\n${pages.map(page => 
              `• **${page.title}**\n  Status: ${page.status}\n  Tags: ${page.tags.join(', ') || 'None'}\n  URL: ${page.url}\n  Created: ${page.createdDate ? new Date(page.createdDate).toLocaleDateString() : 'Unknown'}`
            ).join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error listing database pages:', error);
      throw new Error(`Failed to list database pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export {} 