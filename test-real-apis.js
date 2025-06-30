#!/usr/bin/env node

import { GitHubService } from './dist/services/github.js';
import { NotionService } from './dist/services/notion.js';
import { WebSearchService } from './dist/services/web-search.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRealAPIs() {
    console.log('🔍 Testing Real API Connections...\n');

    try {
        // Test GitHub connection
        console.log('🐙 Testing GitHub API...');
        const githubService = new GitHubService();
        const repoInfo = await githubService.getRepositoryInfo();
        console.log('✅ GitHub API working:', repoInfo.content[0].text.substring(0, 100) + '...\n');

        // Test Notion connection
        console.log('📝 Testing Notion API...');
        const notionService = new NotionService();
        const searchResult = await notionService.searchPages({ query: 'test' });
        console.log('✅ Notion API working:', searchResult.content[0].text.substring(0, 100) + '...\n');

        // Test Web Search
        console.log('🔍 Testing Web Search...');
        const webSearchService = new WebSearchService();
        const searchResults = await webSearchService.search({ query: 'MCP server', maxResults: 3 });
        console.log('✅ Web Search working:', searchResults.content[0].text.substring(0, 100) + '...\n');

        console.log('🎉 All API connections successful!');
        console.log('\n📋 Your MCP server is ready to use with:');
        console.log('• ✅ GitHub repository: hisham-maarraoui/MCP-Server-Project');
        console.log('• ✅ Notion database: 22024ad5de408050b935edbe3fffeb23');
        console.log('• ✅ Web search: Enabled');
        console.log('• ⚠️  Google Calendar: Requires OAuth flow (configured but needs authentication)');
        console.log('• ⚠️  OpenAI: Not configured (optional for enhanced content analysis)');

    } catch (error) {
        console.error('❌ API test failed:', error.message);

        if (error.message.includes('GitHub')) {
            console.log('\n💡 GitHub troubleshooting:');
            console.log('• Check if GITHUB_TOKEN has correct permissions (repo, issues)');
            console.log('• Verify GITHUB_OWNER and GITHUB_REPO are correct');
        }

        if (error.message.includes('Notion')) {
            console.log('\n💡 Notion troubleshooting:');
            console.log('• Check if NOTION_TOKEN is valid');
            console.log('• Verify NOTION_DATABASE_ID is correct');
            console.log('• Ensure integration has access to the database');
        }
    }
}

testRealAPIs(); 