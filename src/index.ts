#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ScreepsTools } from './tools.js';
import { Command } from 'commander';
import { ConnectionConfig } from './types.js';

class ScreepsMCPServer {
  private server: Server;
  private tools: ScreepsTools;

  constructor(connectionConfig: ConnectionConfig) {
    this.server = new Server(
      {
        name: 'screeps-api-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new ScreepsTools(connectionConfig);
    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.getTools(),
      };
    });

    // Handle tool call requests
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.tools.handleToolCall(name, args || {});
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });

    // Error handling
    this.server.onerror = error => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    await this.tools.waitUntilReady();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Screeps API MCP Server running on stdio');
  }
}

// Parse command line arguments
function parseCliArgs(): ConnectionConfig {
  const program = new Command();

  program
    .name('screeps-api-mcp')
    .description('Screeps API MCP Server')
    .version('1.0.0')
    .option('--token <token>', 'Screeps API token')
    .option('--username <username>', 'Screeps username')
    .option('--password <password>', 'Screeps password')
    .option('--host <host>', 'Screeps server host', 'screeps.com')
    .option('--secure', 'Use HTTPS/WSS', true)
    .option('--no-secure', 'Use HTTP/WS')
    .option('--shard <shard>', 'Default shard', 'shard0')
    .parse();

  const options = program.opts();

  // Check for environment variables as fallback
  const token = options.token || process.env.SCREEPS_TOKEN;
  const username = options.username || process.env.SCREEPS_USERNAME;
  const password = options.password || process.env.SCREEPS_PASSWORD;
  const host = options.host || process.env.SCREEPS_HOST || 'screeps.com';
  const secure = options.secure !== false && process.env.SCREEPS_SECURE !== 'false';
  const shard = options.shard || process.env.SCREEPS_SHARD || 'shard0';

  // Validate authentication parameters
  if (!token && (!username || !password)) {
    console.error(
      'Error: Must provide either --token or both --username and --password (or use environment variables)'
    );
    console.error(
      'Environment variables: SCREEPS_TOKEN, SCREEPS_USERNAME, SCREEPS_PASSWORD, SCREEPS_HOST, SCREEPS_SECURE, SCREEPS_SHARD'
    );
    process.exit(1);
  }

  return {
    host,
    secure,
    username,
    password,
    token,
    shard,
  };
}

// Start the server
const connectionConfig = parseCliArgs();
const server = new ScreepsMCPServer(connectionConfig);
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
