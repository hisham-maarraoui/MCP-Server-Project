import { Octokit } from 'octokit';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const GitHubConfigSchema = z.object({
  token: z.string(),
  owner: z.string(),
  repo: z.string(),
});

export class GitHubService {
  private octokit: Octokit;
  private config: z.infer<typeof GitHubConfigSchema>;

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      throw new Error('GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.');
    }

    this.config = GitHubConfigSchema.parse({ token, owner, repo });
    this.octokit = new Octokit({ auth: token });
  }

  async createIssue(args: any) {
    const schema = z.object({
      title: z.string(),
      body: z.string(),
      labels: z.array(z.string()).optional(),
    });

    const { title, body, labels = [] } = schema.parse(args);

    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        labels: ['content', ...labels],
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ GitHub issue created successfully!\n\n**Issue #${response.data.number}**: ${response.data.title}\n\nURL: ${response.data.html_url}\n\nStatus: ${response.data.state}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error creating GitHub issue:', error);
      throw new Error(`Failed to create GitHub issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createBranch(args: any) {
    const schema = z.object({
      branchName: z.string(),
      baseBranch: z.string().default('main'),
    });

    const { branchName, baseBranch } = schema.parse(args);

    try {
      // Get the latest commit from the base branch
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${baseBranch}`,
      });

      // Create the new branch
      await this.octokit.rest.git.createRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Branch '${branchName}' created successfully from '${baseBranch}'!\n\nBranch URL: https://github.com/${this.config.owner}/${this.config.repo}/tree/${branchName}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error creating GitHub branch:', error);
      throw new Error(`Failed to create GitHub branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createPullRequest(args: any) {
    const schema = z.object({
      title: z.string(),
      body: z.string(),
      head: z.string(),
      base: z.string().default('main'),
    });

    const { title, body, head, base } = schema.parse(args);

    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        head,
        base,
      });

      return {
        content: [
          {
            type: 'text',
            text: `✅ Pull request created successfully!\n\n**PR #${response.data.number}**: ${response.data.title}\n\nURL: ${response.data.html_url}\n\nStatus: ${response.data.state}\n\nFrom: ${head} → To: ${base}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error creating GitHub pull request:', error);
      throw new Error(`Failed to create GitHub pull request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listIssues(args: any = {}) {
    const schema = z.object({
      state: z.enum(['open', 'closed', 'all']).default('open'),
      labels: z.string().optional(),
      limit: z.number().default(10),
    });

    const { state, labels, limit } = schema.parse(args);

    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner: this.config.owner,
        repo: this.config.repo,
        state,
        labels: labels || undefined,
        per_page: limit,
      });

      const issues = response.data.map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels.map(label => typeof label === 'string' ? label : label.name || ''),
        created_at: issue.created_at,
      }));

      return {
        content: [
          {
            type: 'text',
            text: `📋 Found ${issues.length} issues:\n\n${issues.map(issue => 
              `• #${issue.number}: ${issue.title} (${issue.state})\n  Labels: ${issue.labels.join(', ') || 'none'}\n  URL: ${issue.url}`
            ).join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error listing GitHub issues:', error);
      throw new Error(`Failed to list GitHub issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRepositoryInfo() {
    try {
      const response = await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      return {
        content: [
          {
            type: 'text',
            text: `📁 Repository: ${response.data.full_name}\n\nDescription: ${response.data.description || 'No description'}\n\nStars: ⭐ ${response.data.stargazers_count}\nForks: 🔀 ${response.data.forks_count}\nLanguage: ${response.data.language || 'Not specified'}\n\nURL: ${response.data.html_url}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting repository info:', error);
      throw new Error(`Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export {} 