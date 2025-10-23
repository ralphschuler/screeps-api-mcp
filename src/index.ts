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
import { ConfigManager, Logger } from './config.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as {
  name: string;
  version: string;
  bin?: Record<string, string>;
};

const packageName = packageJson.name;
const packageVersion = packageJson.version;
const cliName = packageJson.bin ? Object.keys(packageJson.bin)[0] ?? packageName : packageName;

class ScreepsMCPServer {
  private server: Server;
  private tools: ScreepsTools;

  constructor(connectionConfig: ConnectionConfig) {
    // Configure logging based on environment
    const envSettings = ConfigManager.getEnvironmentSettings();
    Logger.configure(envSettings.logLevel, envSettings.enableDetailedErrors);
    
    // Log sanitized configuration for debugging
    Logger.debug('Server configuration:', ConfigManager.sanitizeForLogging(connectionConfig));

    this.server = new Server(
      {
        name: packageName,
        version: packageVersion,
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

    // Enhanced error handling
    this.server.onerror = error => {
      Logger.error('MCP Server Error:', error);
    };

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      Logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        this.tools.cleanup();
        await this.server.close();
        Logger.info('Server shutdown complete');
        process.exit(0);
      } catch (error) {
        Logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async start(): Promise<void> {
    try {
      await this.tools.waitUntilReady();
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      Logger.info('Screeps API MCP Server running on stdio');
    } catch (error) {
      Logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }
}

/**
 * Parse command line arguments with enhanced validation
 */
function parseCliArgs(): ConnectionConfig {
  const program = new Command();

  program
    .name(cliName)
    .description('Screeps API MCP Server with enhanced security and validation')
    .version(packageVersion)
    .option('--token <token>', 'Screeps API token (recommended for security)')
    .option('--username <username>', 'Screeps username')
    .option('--password <password>', 'Screeps password')
    .option('--host <host>', 'Screeps server host', 'screeps.com')
    .option('--secure', 'Use HTTPS/WSS (default: true)', true)
    .option('--no-secure', 'Use HTTP/WS (not recommended for production)')
    .option('--shard <shard>', 'Default shard', 'shard0')
    .addHelpText('after', `
Environment Variables:
  SCREEPS_TOKEN        Screeps API token (most secure option)
  SCREEPS_USERNAME     Screeps username
  SCREEPS_PASSWORD     Screeps password  
  SCREEPS_HOST         Server hostname (default: screeps.com)
  SCREEPS_SECURE       Use HTTPS/WSS (default: true)
  SCREEPS_SHARD        Default shard (default: shard0)
  LOG_LEVEL           Log level: debug, info, warn, error (default: info)
  NODE_ENV            Environment: development, test, production

Security Note:
  API tokens are recommended over username/password for better security.
  Generate tokens at: https://screeps.com/a/#!/account/auth-tokens`)
    .parse();

  const options = program.opts();

  try {
    // Use ConfigManager for validation and loading
    const config = ConfigManager.loadConfig(options);
    ConfigManager.validateCredentials(config);
    return config;
  } catch (error) {
    Logger.error('Configuration error:', error);
    console.error('\nFor help, run: screeps-api-mcp --help');
    process.exit(1);
  }
}

// Start the server with enhanced error handling
async function main() {
  try {
    const connectionConfig = parseCliArgs();
    const server = new ScreepsMCPServer(connectionConfig);
    await server.start();
  } catch (error) {
    Logger.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  Logger.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
