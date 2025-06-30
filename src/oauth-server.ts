#!/usr/bin/env node

import express from 'express';
import type { Request, Response } from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Store tokens in a simple file (in production, use a proper database)
const TOKENS_FILE = path.join(process.cwd(), 'google-tokens.json');

function saveTokens(tokens: any) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  console.error('✅ Tokens saved successfully');
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
      console.error('✅ Tokens loaded successfully');
      return tokens;
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return null;
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Google Calendar OAuth Setup</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .button { background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
          .success { background: #34a853; }
          .error { background: #ea4335; }
          .info { background: #fbbc04; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>🔐 Google Calendar OAuth Setup</h1>
        
        <h2>Current Status</h2>
        ${loadTokens() ? '<p class="success">✅ Tokens are configured and ready to use!</p>' : '<p class="error">❌ No tokens found. Please authenticate.</p>'}
        
        <h2>Authentication</h2>
        <p>Click the button below to authenticate with Google Calendar:</p>
        <a href="/auth" class="button">🔑 Authenticate with Google</a>
        
        <h2>Test Calendar Access</h2>
        <p>Test your calendar access:</p>
        <a href="/test-calendar" class="button info">📅 Test Calendar</a>
        
        <h2>Configuration</h2>
        <p>Add these tokens to your MCP server environment:</p>
        <pre id="tokens">${loadTokens() ? JSON.stringify(loadTokens(), null, 2) : 'No tokens available'}</pre>
        
        <h2>Next Steps</h2>
        <ol>
          <li>Click "Authenticate with Google" to get tokens</li>
          <li>Copy the tokens from above</li>
          <li>Add them to your MCP server's environment variables</li>
          <li>Restart your MCP server</li>
        </ol>
      </body>
    </html>
  `);
});

app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent to get refresh token
  });
  
  console.error('🔗 Redirecting to Google OAuth:', authUrl);
  res.redirect(authUrl);
});

app.get('/auth/google/callback', (req, res) => {
  (async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('❌ Authorization code not received');
    }
    try {
      console.error('🔄 Exchanging authorization code for tokens...');
      const { tokens } = await oauth2Client.getToken(code as string);
      saveTokens(tokens);
      oauth2Client.setCredentials(tokens);
      console.error('✅ OAuth flow completed successfully!');
      res.send(`
        <html>
          <head>
            <title>OAuth Success</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { background: #34a853; color: white; padding: 20px; border-radius: 4px; }
              pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>🎉 OAuth Authentication Successful!</h1>
              <p>Your Google Calendar access has been configured successfully.</p>
            </div>
            
            <h2>Tokens Received:</h2>
            <pre>${JSON.stringify(tokens, null, 2)}</pre>
            
            <h2>Next Steps:</h2>
            <ol>
              <li>Copy the tokens above</li>
              <li>Add them to your MCP server environment</li>
              <li>Restart your MCP server</li>
              <li>Test calendar functionality</li>
            </ol>
            
            <p><a href="/">← Back to main page</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('❌ OAuth error:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #ea4335; color: white; padding: 20px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ OAuth Authentication Failed</h1>
              <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
            <p><a href="/">← Back to main page</a></p>
          </body>
        </html>
      `);
    }
  })(req as Request, res as Response);
});

app.get('/test-calendar', (req, res) => {
  (async (req: Request, res: Response) => {
    try {
      const tokens = loadTokens();
      if (!tokens) {
        return res.status(400).send('❌ No tokens found. Please authenticate first.');
      }
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime',
      });
      const events = response.data.items || [];
      res.send(`
        <html>
          <head>
            <title>Calendar Test</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { background: #34a853; color: white; padding: 20px; border-radius: 4px; }
              .event { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Calendar Access Test Successful!</h1>
              <p>Found ${events.length} upcoming events in your calendar.</p>
            </div>
            
            <h2>Upcoming Events:</h2>
            ${events.map((event: any) => `
              <div class="event">
                <strong>${event.summary || 'No title'}</strong><br>
                Start: ${event.start?.dateTime || event.start?.date}<br>
                ${event.description ? `Description: ${event.description}` : ''}
              </div>
            `).join('')}
            
            <p><a href="/">← Back to main page</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('❌ Calendar test error:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>Calendar Test Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #ea4335; color: white; padding: 20px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ Calendar Test Failed</h1>
              <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
            <p><a href="/">← Back to main page</a></p>
          </body>
        </html>
      `);
    }
  })(req as Request, res as Response);
});

// Start server
app.listen(PORT, () => {
  console.error(`🚀 OAuth server running at http://localhost:${PORT}`);
  console.error(`📅 Google Calendar OAuth setup ready!`);
  console.error(`🔗 Open http://localhost:${PORT} to start authentication`);
});

export { oauth2Client, saveTokens, loadTokens }; 