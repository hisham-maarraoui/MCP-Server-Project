import { google } from 'googleapis';
import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const GoogleConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.string(),
});

export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: any;
  private config: z.infer<typeof GoogleConfigSchema>;
  private tokensFile: string;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google Calendar configuration missing. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.');
    }

    this.config = GoogleConfigSchema.parse({ clientId, clientSecret, redirectUri });
    const projectRoot = process.cwd();
    const primaryPath = path.join(projectRoot, 'google-tokens.json');
    const fallbackPath = path.resolve(__dirname, '../../google-tokens.json');
    this.tokensFile = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;
    console.error('[GoogleCalendarService] Checking primary path:', primaryPath);
    console.error('[GoogleCalendarService] Checking fallback path:', fallbackPath);
    console.error('[GoogleCalendarService] Using tokens file:', this.tokensFile);
    if (!fs.existsSync(this.tokensFile)) {
      console.error('[GoogleCalendarService] google-tokens.json not found!');
    } else {
      try {
        const tokens = JSON.parse(fs.readFileSync(this.tokensFile, 'utf-8'));
        console.error('[GoogleCalendarService] Tokens loaded successfully:', Object.keys(tokens));
      } catch (err) {
        console.error('[GoogleCalendarService] Error reading google-tokens.json:', err);
      }
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    // Try to load existing tokens
    this.loadTokens();
  }

  private loadTokens() {
    try {
      if (fs.existsSync(this.tokensFile)) {
        const tokens = JSON.parse(fs.readFileSync(this.tokensFile, 'utf8'));
        this.oauth2Client.setCredentials(tokens);
        console.error('✅ Google Calendar tokens loaded successfully');
        return true;
      }
    } catch (error) {
      console.error('Error loading Google Calendar tokens:', error);
    }
    return false;
  }

  // This method would typically be called during the OAuth flow
  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  // Check if we have valid credentials
  private async ensureAuthenticated() {
    const tokens = this.oauth2Client.credentials;
    if (!tokens || !tokens.access_token) {
      throw new Error('Google Calendar authentication required. Please run the OAuth setup first: npm run oauth-setup');
    }
    
    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      try {
        console.error('🔄 Refreshing Google Calendar token...');
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);
        console.error('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Failed to refresh token:', error);
        throw new Error('Google Calendar token expired and could not be refreshed. Please re-authenticate.');
      }
    }
  }

  async createEvent(args: any = {}) {
    const schema = z.object({
      title: z.string(),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
      attendees: z.array(z.string()).optional(),
    });
    const { title, description, startTime, endTime, attendees = [] } = schema.parse(args);

    // Debug logging for event creation
    console.error('[GoogleCalendarService] Attempting to create event:', { title, startTime, endTime, attendees });

    try {
      await this.ensureAuthenticated();
      // Debug: Real API call
      console.error('[GoogleCalendarService] Using real Google Calendar API to create event.');

      const event = {
        summary: title,
        description: description || 'Content development deadline',
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
        attendees: attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all',
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Calendar event created successfully!\n\n**Event**: ${response.data.summary}\n\n**Start**: ${new Date(response.data.start.dateTime).toLocaleString()}\n**End**: ${new Date(response.data.end.dateTime).toLocaleString()}\n\n**Description**: ${response.data.description || 'No description'}\n\n**Attendees**: ${response.data.attendees?.map((a: any) => a.email).join(', ') || 'None'}\n\n**Event URL**: ${response.data.htmlLink}`,
          },
        ],
      };
    } catch (err) {
      // Debug: Fallback to mock mode
      console.error('[GoogleCalendarService] Error creating real event, falling back to mock mode:', err);
      return {
        content: [
          {
            type: 'text',
            text: `📅 **Mock Calendar Event Created**\n\n**Event**: ${title}\n\n**Start**: ${new Date(startTime).toLocaleString()}\n**End**: ${new Date(endTime).toLocaleString()}\n\n**Description**: ${description || 'Content development deadline'}\n\n**Attendees**: ${attendees.join(', ') || 'None'}\n\n*Note: This is a mock response. In production, complete OAuth authentication to create real calendar events.*`,
          },
        ],
      };
    }
  }

  async listEvents(args: any = {}) {
    const schema = z.object({
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().default(10),
    });

    const { timeMin, timeMax, maxResults } = schema.parse(args);

    try {
      await this.ensureAuthenticated();

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items?.map((event: any) => ({
        id: event.id,
        title: event.summary,
        description: event.description,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        url: event.htmlLink,
      })) || [];

      return {
        content: [
          {
            type: 'text',
            text: `📅 Upcoming calendar events:\n\n${events.map((event: any) => 
              `• **${event.title}**\n  Start: ${new Date(event.start).toLocaleString()}\n  End: ${new Date(event.end).toLocaleString()}\n  Attendees: ${event.attendees.join(', ') || 'None'}\n  URL: ${event.url}`
            ).join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error listing calendar events:', error);
      
      // For demo purposes, return a mock response
      if (error instanceof Error && error.message.includes('authentication')) {
        return {
          content: [
            {
              type: 'text',
              text: `📅 **Mock Calendar Events**\n\n• **Content Review Meeting**\n  Start: ${new Date().toLocaleString()}\n  End: ${new Date(Date.now() + 60 * 60 * 1000).toLocaleString()}\n  Attendees: team@example.com\n\n• **Publishing Deadline**\n  Start: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}\n  End: ${new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toLocaleString()}\n  Attendees: None\n\n*Note: This is a mock response. In production, complete OAuth authentication to list real calendar events.*`,
            },
          ],
        };
      }
      
      throw new Error(`Failed to list calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEvent(args: any) {
    const schema = z.object({
      eventId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    });

    const { eventId, title, description, startTime, endTime } = schema.parse(args);

    try {
      await this.ensureAuthenticated();

      const updateData: any = {};
      if (title) updateData.summary = title;
      if (description) updateData.description = description;
      if (startTime) updateData.start = { dateTime: startTime, timeZone: 'UTC' };
      if (endTime) updateData.end = { dateTime: endTime, timeZone: 'UTC' };

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: updateData,
        sendUpdates: 'all',
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Calendar event updated successfully!\n\n**Event**: ${response.data.summary}\n\n**Start**: ${new Date(response.data.start.dateTime).toLocaleString()}\n**End**: ${new Date(response.data.end.dateTime).toLocaleString()}\n\n**Event URL**: ${response.data.htmlLink}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteEvent(args: any) {
    const schema = z.object({
      eventId: z.string(),
    });

    const { eventId } = schema.parse(args);

    try {
      await this.ensureAuthenticated();

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Calendar event deleted successfully!\n\n**Event ID**: ${eventId}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to get OAuth URL for authentication
  getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  // Helper method to handle OAuth callback
  async handleAuthCallback(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }
} 