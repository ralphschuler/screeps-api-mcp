#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { ScreepsTools } from './tools.js';

class ScreepsMCPServer {
  private server: Server;
  private tools: ScreepsTools;

  constructor() {
    this.server = new Server(
      {
        name: 'screeps-api-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.tools = new ScreepsTools();
    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.getTools()
      };
    });

    // Handle tool call requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.tools.handleToolCall(name, args || {});
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Screeps API MCP Server running on stdio');
  }
}

// Start the server
const server = new ScreepsMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});