import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ScreepsAPI } from './screeps-api.js';
import {
  ConnectionConfig,
  ConnectionConfigSchema,
  ConsoleMessage,
  ConsoleCommandArgsSchema,
  ConsoleHistoryArgsSchema,
  ConsoleStreamStartArgsSchema,
  ConsoleStreamReadArgsSchema,
  RoomNameArgsSchema,
  MemoryPathArgsSchema,
  MemorySetArgsSchema,
  MemorySegmentArgsSchema,
  MemorySegmentSetArgsSchema,
} from './types.js';
import { validateInput, InputSanitizer, ErrorHandler, RateLimiter } from './validation.js';
import { Logger } from './config.js';

function formatConsoleMessages(messages: ConsoleMessage[]): string {
  if (messages.length === 0) {
    return 'No console messages available.';
  }

  return messages
    .map(message => {
      const timestamp = new Date(message.timestamp || Date.now()).toISOString();
      const type = message.type ? message.type.toUpperCase() : 'LOG';
      return `${timestamp} [${message.shard}] (${type}) ${message.line}`;
    })
    .join('\n');
}

interface ScreepsToolsOptions {
  apiFactory?: (config: ConnectionConfig) => ScreepsAPI;
  skipAuthentication?: boolean;
}

/**
 * ScreepsTools provides MCP tool implementations for Screeps API interactions.
 * Implements security best practices including input validation, rate limiting,
 * and proper error handling.
 */
export class ScreepsTools {
  private readonly config: ConnectionConfig;
  private readonly apiReady: Promise<ScreepsAPI>;
  private readonly rateLimiter: RateLimiter;
  private readonly cleanupInterval?: ReturnType<typeof setInterval>;

  /**
   * Creates a new ScreepsTools instance with enhanced security and validation.
   * @param connectionConfig - Screeps server connection configuration
   * @param options - Optional configuration for testing and customization
   */
  constructor(connectionConfig: ConnectionConfig, options: ScreepsToolsOptions = {}) {
    this.config = ConnectionConfigSchema.parse(connectionConfig);
    this.rateLimiter = new RateLimiter(60000, 100); // 100 requests per minute

    const factory = options.apiFactory ?? (cfg => new ScreepsAPI(cfg));
    const api = factory(this.config);
    const shouldAuthenticate = !options.skipAuthentication;
    const host = this.config.host;

    this.apiReady = (async () => {
      if (shouldAuthenticate) {
        await api.authenticate();
        Logger.info(`Successfully connected to Screeps server at ${host}`);
      }
      return api;
    })().catch(error => {
      Logger.error('Failed to initialize Screeps connection:', error);
      throw error;
    });

    // Clean up rate limiter periodically (only in production, not in tests)
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => this.rateLimiter.cleanup(), 300000); // Every 5 minutes
    }
  }

  /**
   * Returns the list of available MCP tools with proper schema definitions.
   * Each tool includes comprehensive input validation and security constraints.
   */
  getTools(): Tool[] {
    return [
      {
        name: 'screeps_connection_status',
        description: 'Show connection details for the configured Screeps server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'screeps_console_command',
        description: 'Execute a console command on the Screeps server',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'JavaScript code to execute in the Screeps console',
            },
            shard: {
              type: 'string',
              description:
                'Shard to execute the command on (optional, defaults to configured shard)',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'screeps_console_history',
        description: 'Get recent console messages from Screeps',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of messages to retrieve',
              default: 20,
              minimum: 1,
              maximum: 200,
            },
          },
        },
      },
      {
        name: 'screeps_console_stream_start',
        description: 'Start a live console stream for the configured connection',
        inputSchema: {
          type: 'object',
          properties: {
            shard: {
              type: 'string',
              description: 'Shard to subscribe to (optional, defaults to configured shard)',
            },
            bufferSize: {
              type: 'number',
              description: 'Maximum number of messages to retain in the buffer',
              default: 500,
              minimum: 10,
              maximum: 5000,
            },
          },
        },
      },
      {
        name: 'screeps_console_stream_read',
        description: 'Read buffered messages from the live console stream',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of buffered messages to return',
              default: 50,
              minimum: 1,
              maximum: 500,
            },
            since: {
              type: 'number',
              description: 'Only return messages newer than this timestamp (ms since epoch)',
            },
          },
        },
      },
      {
        name: 'screeps_console_stream_stop',
        description: 'Stop the live console stream',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'screeps_user_info',
        description: 'Get information about the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'screeps_shards_info',
        description: 'Retrieve shard information from the Screeps server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'screeps_room_objects',
        description: 'Get objects in a specific room',
        inputSchema: {
          type: 'object',
          properties: {
            roomName: {
              type: 'string',
              description: 'Name of the room (e.g., "W1N1")',
            },
          },
          required: ['roomName'],
        },
      },
      {
        name: 'screeps_room_terrain',
        description: 'Get terrain data for a specific room',
        inputSchema: {
          type: 'object',
          properties: {
            roomName: {
              type: 'string',
              description: 'Name of the room (e.g., "W1N1")',
            },
          },
          required: ['roomName'],
        },
      },
      {
        name: 'screeps_memory_get',
        description: 'Read a value from Screeps memory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Memory path to read (e.g., "stats.cpu")',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'screeps_memory_set',
        description: 'Write a value into Screeps memory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Memory path to write (e.g., "stats.cpu")',
            },
            value: {
              type: 'string',
              description: 'Stringified value to store at the path',
            },
          },
          required: ['path', 'value'],
        },
      },
      {
        name: 'screeps_memory_delete',
        description: 'Remove a value from Screeps memory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Memory path to delete (e.g., "stats.cpu")',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'screeps_memory_segment_get',
        description: 'Get a memory segment from Screeps',
        inputSchema: {
          type: 'object',
          properties: {
            segment: {
              type: 'number',
              description: 'Memory segment number (0-99)',
              minimum: 0,
              maximum: 99,
            },
          },
          required: ['segment'],
        },
      },
      {
        name: 'screeps_memory_segment_set',
        description: 'Set a memory segment in Screeps',
        inputSchema: {
          type: 'object',
          properties: {
            segment: {
              type: 'number',
              description: 'Memory segment number (0-99)',
              minimum: 0,
              maximum: 99,
            },
            data: {
              type: 'string',
              description: 'Data to store in the memory segment',
            },
          },
          required: ['segment', 'data'],
        },
      },
    ];
  }

  /**
   * Handles tool execution with rate limiting, input validation, and error handling.
   * @param name - The name of the tool to execute
   * @param args - The arguments passed to the tool
   * @returns Promise resolving to the tool execution result
   */
  async handleToolCall(name: string, args: unknown): Promise<CallToolResult> {
    // Rate limiting check
    if (!this.rateLimiter.allowRequest(`tool:${name}`)) {
      return {
        content: [
          { type: 'text', text: 'Rate limit exceeded. Please wait before making more requests.' },
        ],
        isError: true,
      };
    }

    try {
      switch (name) {
        case 'screeps_connection_status':
          return await this.handleConnectionStatus();
        case 'screeps_console_command':
          return await this.handleConsoleCommand(args);
        case 'screeps_console_history':
          return await this.handleConsoleHistory(args);
        case 'screeps_console_stream_start':
          return await this.handleConsoleStreamStart(args);
        case 'screeps_console_stream_read':
          return await this.handleConsoleStreamRead(args);
        case 'screeps_console_stream_stop':
          return await this.handleConsoleStreamStop();
        case 'screeps_user_info':
          return await this.handleUserInfo();
        case 'screeps_shards_info':
          return await this.handleShardInfo();
        case 'screeps_room_objects':
          return await this.handleRoomObjects(args);
        case 'screeps_room_terrain':
          return await this.handleRoomTerrain(args);
        case 'screeps_memory_get':
          return await this.handleMemoryGet(args);
        case 'screeps_memory_set':
          return await this.handleMemorySet(args);
        case 'screeps_memory_delete':
          return await this.handleMemoryDelete(args);
        case 'screeps_memory_segment_get':
          return await this.handleMemorySegmentGet(args);
        case 'screeps_memory_segment_set':
          return await this.handleMemorySegmentSet(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return ErrorHandler.formatGenericError(error, `handling tool ${name}`);
    }
  }

  private async handleConnectionStatus(): Promise<CallToolResult> {
    try {
      const api = await this.getApi();
      const summary = api.getConnectionSummary('default');

      const lines = [
        `Connection name: ${summary.name}`,
        `Host: ${summary.secure ? 'https' : 'http'}://${summary.host}`,
        `Default shard: ${summary.shard}`,
        `Authenticated user: ${summary.authenticatedUser ?? 'unknown'}`,
        `Token available: ${summary.hasToken ? 'yes' : 'no'}`,
      ];

      if (summary.stream) {
        lines.push(
          'Console stream:',
          `  active: ${summary.stream.isActive ? 'yes' : 'no'}`,
          `  shard: ${summary.stream.shard}`,
          `  buffered messages: ${summary.stream.buffered}`
        );
      } else {
        lines.push('Console stream: not started');
      }

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'getting connection status');
    }
  }

  private async handleConsoleCommand(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(ConsoleCommandArgsSchema, args, 'console command');
    if (!validation.success) {
      return validation.error;
    }

    const { command, shard } = validation.data;
    const sanitizedCommand = InputSanitizer.sanitizeConsoleCommand(command);

    try {
      const api = await this.getApi();
      const result = await api.executeConsoleCommand(sanitizedCommand, shard);

      return {
        content: [
          {
            type: 'text',
            text: `Console command executed successfully. Timestamp: ${result.timestamp}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'executing console command');
    }
  }

  private async handleConsoleHistory(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(ConsoleHistoryArgsSchema, args, 'console history');
    if (!validation.success) {
      return validation.error;
    }

    const { limit } = validation.data;

    try {
      const api = await this.getApi();
      const messages = await api.getConsoleHistory(limit);

      const formattedMessages = messages
        .map(message => {
          const timestamp = new Date(message.timestamp || Date.now()).toISOString();
          const type = message.type ? message.type.toUpperCase() : 'LOG';
          return `[${message.shard}] ${timestamp} (${type}) ${message.line}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Console History (last ${messages.length} messages):\n\n${formattedMessages}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'fetching console history');
    }
  }

  private async handleConsoleStreamStart(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(ConsoleStreamStartArgsSchema, args, 'console stream start');
    if (!validation.success) {
      return validation.error;
    }

    const { shard, bufferSize } = validation.data;

    try {
      const api = await this.getApi();
      await api.startConsoleStream(shard, bufferSize);

      const state = api.getConsoleStreamState();

      return {
        content: [
          {
            type: 'text',
            text: `Console stream started on shard ${state.shard}. Buffering up to ${bufferSize} messages.`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'starting console stream');
    }
  }

  private async handleConsoleStreamRead(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(ConsoleStreamReadArgsSchema, args, 'console stream read');
    if (!validation.success) {
      return validation.error;
    }

    const { limit, since } = validation.data;

    try {
      const api = await this.getApi();
      const messages = api.getBufferedConsoleMessages(limit, since);

      return {
        content: [
          {
            type: 'text',
            text: formatConsoleMessages(messages),
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'reading console stream');
    }
  }

  private async handleConsoleStreamStop(): Promise<CallToolResult> {
    try {
      const api = await this.getApi();
      api.stopConsoleStream();

      return {
        content: [
          {
            type: 'text',
            text: 'Console stream stopped.',
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'stopping console stream');
    }
  }

  private async handleUserInfo(): Promise<CallToolResult> {
    try {
      const api = await this.getApi();
      const userInfo = await api.getUserInfo();

      return {
        content: [
          {
            type: 'text',
            text: `User Info:\n${JSON.stringify(userInfo, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'fetching user info');
    }
  }

  private async handleShardInfo(): Promise<CallToolResult> {
    try {
      const api = await this.getApi();
      const shards = await api.getShardInfo();

      if (shards.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No shard information available from the server.',
            },
          ],
        };
      }

      const formatted = shards
        .map(shard => {
          const parts = [`- ${shard.name}`];
          if (typeof shard.tick === 'number') {
            parts.push(`tick ${shard.tick}`);
          }
          if (typeof shard.players === 'number') {
            parts.push(`${shard.players} players`);
          }
          if (typeof shard.uptime === 'number') {
            parts.push(`uptime ${shard.uptime}`);
          }
          return parts.join(' — ');
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Shards:\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'fetching shard info');
    }
  }

  private async handleRoomObjects(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(RoomNameArgsSchema, args, 'room objects');
    if (!validation.success) {
      return validation.error;
    }

    const { roomName } = validation.data;

    try {
      const api = await this.getApi();
      const objects = await api.getRoomObjects(roomName);

      return {
        content: [
          {
            type: 'text',
            text: `Room Objects in ${roomName} (${objects.length} objects):\n${JSON.stringify(objects, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'fetching room objects');
    }
  }

  private async handleRoomTerrain(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(RoomNameArgsSchema, args, 'room terrain');
    if (!validation.success) {
      return validation.error;
    }

    const { roomName } = validation.data;

    try {
      const api = await this.getApi();
      const terrain = await api.getRoomTerrain(roomName);

      return {
        content: [
          {
            type: 'text',
            text: `Room Terrain for ${roomName}:\n${JSON.stringify(terrain, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'fetching room terrain');
    }
  }

  private async handleMemoryGet(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(MemoryPathArgsSchema, args, 'memory get');
    if (!validation.success) {
      return validation.error;
    }

    const { path } = validation.data;
    const sanitizedPath = InputSanitizer.sanitizeMemoryPath(path);

    try {
      const api = await this.getApi();
      const value = await api.getMemory(sanitizedPath);

      return {
        content: [
          {
            type: 'text',
            text:
              value !== null
                ? `Memory value at ${sanitizedPath}:\n${value}`
                : `Memory path ${sanitizedPath} is empty.`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'getting memory value');
    }
  }

  private async handleMemorySet(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(MemorySetArgsSchema, args, 'memory set');
    if (!validation.success) {
      return validation.error;
    }

    const { path, value } = validation.data;
    const sanitizedPath = InputSanitizer.sanitizeMemoryPath(path);
    const sanitizedValue = InputSanitizer.sanitizeString(value);

    try {
      const api = await this.getApi();
      await api.setMemory(sanitizedPath, sanitizedValue);

      return {
        content: [
          {
            type: 'text',
            text: `Memory path ${sanitizedPath} updated successfully.`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'setting memory value');
    }
  }

  private async handleMemoryDelete(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(MemoryPathArgsSchema, args, 'memory delete');
    if (!validation.success) {
      return validation.error;
    }

    const { path } = validation.data;
    const sanitizedPath = InputSanitizer.sanitizeMemoryPath(path);

    try {
      const api = await this.getApi();
      await api.deleteMemory(sanitizedPath);

      return {
        content: [
          {
            type: 'text',
            text: `Memory path ${sanitizedPath} deleted successfully.`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'deleting memory value');
    }
  }

  private async handleMemorySegmentGet(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(MemorySegmentArgsSchema, args, 'memory segment get');
    if (!validation.success) {
      return validation.error;
    }

    const { segment } = validation.data;

    try {
      const api = await this.getApi();
      const segmentData = await api.getMemorySegment(segment);

      return {
        content: [
          {
            type: 'text',
            text: `Memory Segment ${segment}:\n${segmentData.data}`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'getting memory segment');
    }
  }

  private async handleMemorySegmentSet(args: unknown): Promise<CallToolResult> {
    const validation = validateInput(MemorySegmentSetArgsSchema, args, 'memory segment set');
    if (!validation.success) {
      return validation.error;
    }

    const { segment, data } = validation.data;
    const sanitizedData = InputSanitizer.sanitizeString(data);

    try {
      const api = await this.getApi();
      await api.setMemorySegment(segment, sanitizedData);

      return {
        content: [
          {
            type: 'text',
            text: `Memory segment ${segment} updated successfully.`,
          },
        ],
      };
    } catch (error) {
      return ErrorHandler.formatApiError(error as Error, 'setting memory segment');
    }
  }

  async waitUntilReady(): Promise<void> {
    await this.apiReady;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private async getApi(): Promise<ScreepsAPI> {
    return this.apiReady;
  }
}
