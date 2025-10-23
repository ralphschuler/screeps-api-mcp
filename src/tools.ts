import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ScreepsAPI } from './screeps-api.js';
import { ConnectionConfig, ConnectionConfigSchema, ConsoleMessage } from './types.js';

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

export class ScreepsTools {
  private readonly config: ConnectionConfig;
  private readonly apiReady: Promise<ScreepsAPI>;

  constructor(connectionConfig: ConnectionConfig, options: ScreepsToolsOptions = {}) {
    this.config = ConnectionConfigSchema.parse(connectionConfig);

    const factory = options.apiFactory ?? (cfg => new ScreepsAPI(cfg));
    const api = factory(this.config);
    const shouldAuthenticate = !options.skipAuthentication;
    const host = this.config.host;

    this.apiReady = (async () => {
      if (shouldAuthenticate) {
        await api.authenticate();
        console.error(`Successfully connected to Screeps server at ${host}`);
      }
      return api;
    })().catch(error => {
      console.error(
        'Failed to initialize Screeps connection:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    });
  }

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
              description: 'Shard to execute the command on (optional, defaults to configured shard)',
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

  async handleToolCall(name: string, args: any): Promise<CallToolResult> {
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
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleConnectionStatus(): Promise<CallToolResult> {
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
  }

  private async handleConsoleCommand(args: any): Promise<CallToolResult> {
    if (!args.command || typeof args.command !== 'string') {
      throw new Error('Command parameter is required');
    }

    const api = await this.getApi();
    const result = await api.executeConsoleCommand(args.command, args.shard);

    return {
      content: [
        {
          type: 'text',
          text: `Console command executed successfully. Timestamp: ${result.timestamp}`,
        },
      ],
    };
  }

  private async handleConsoleHistory(args: any): Promise<CallToolResult> {
    const limit = typeof args?.limit === 'number' ? Math.min(Math.max(1, args.limit), 200) : 20;
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
  }

  private async handleConsoleStreamStart(args: any): Promise<CallToolResult> {
    const requestedBufferSize = typeof args?.bufferSize === 'number' ? args.bufferSize : undefined;
    const sanitizedBufferSize =
      typeof requestedBufferSize === 'number'
        ? Math.min(Math.max(requestedBufferSize, 10), 5000)
        : undefined;

    const api = await this.getApi();
    await api.startConsoleStream(args?.shard, sanitizedBufferSize);

    const state = api.getConsoleStreamState();
    const effectiveBufferSize = sanitizedBufferSize ?? 500;

    return {
      content: [
        {
          type: 'text',
          text: `Console stream started on shard ${state.shard}. Buffering up to ${effectiveBufferSize} messages.`,
        },
      ],
    };
  }

  private async handleConsoleStreamRead(args: any): Promise<CallToolResult> {
    const api = await this.getApi();
    const limit = typeof args?.limit === 'number' ? Math.min(Math.max(args.limit, 1), 500) : 50;
    const since = typeof args?.since === 'number' ? args.since : undefined;

    const messages = api.getBufferedConsoleMessages(limit, since);

    return {
      content: [
        {
          type: 'text',
          text: formatConsoleMessages(messages),
        },
      ],
    };
  }

  private async handleConsoleStreamStop(): Promise<CallToolResult> {
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
  }

  private async handleUserInfo(): Promise<CallToolResult> {
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
  }

  private async handleShardInfo(): Promise<CallToolResult> {
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
  }

  private async handleRoomObjects(args: any): Promise<CallToolResult> {
    if (!args?.roomName || typeof args.roomName !== 'string') {
      throw new Error('roomName parameter is required');
    }

    const api = await this.getApi();
    const objects = await api.getRoomObjects(args.roomName);

    return {
      content: [
        {
          type: 'text',
          text: `Room Objects in ${args.roomName} (${objects.length} objects):\n${JSON.stringify(objects, null, 2)}`,
        },
      ],
    };
  }

  private async handleRoomTerrain(args: any): Promise<CallToolResult> {
    if (!args?.roomName || typeof args.roomName !== 'string') {
      throw new Error('roomName parameter is required');
    }

    const api = await this.getApi();
    const terrain = await api.getRoomTerrain(args.roomName);

    return {
      content: [
        {
          type: 'text',
          text: `Room Terrain for ${args.roomName}:\n${JSON.stringify(terrain, null, 2)}`,
        },
      ],
    };
  }

  private async handleMemoryGet(args: any): Promise<CallToolResult> {
    if (!args?.path || typeof args.path !== 'string') {
      throw new Error('path parameter is required');
    }

    const api = await this.getApi();
    const value = await api.getMemory(args.path);

    return {
      content: [
        {
          type: 'text',
          text: value !== null ? `Memory value at ${args.path}:\n${value}` : `Memory path ${args.path} is empty.`,
        },
      ],
    };
  }

  private async handleMemorySet(args: any): Promise<CallToolResult> {
    if (!args?.path || typeof args.path !== 'string') {
      throw new Error('path parameter is required');
    }
    if (args?.value === undefined || typeof args.value !== 'string') {
      throw new Error('value parameter is required');
    }

    const api = await this.getApi();
    await api.setMemory(args.path, args.value);

    return {
      content: [
        {
          type: 'text',
          text: `Memory path ${args.path} updated successfully.`,
        },
      ],
    };
  }

  private async handleMemoryDelete(args: any): Promise<CallToolResult> {
    if (!args?.path || typeof args.path !== 'string') {
      throw new Error('path parameter is required');
    }

    const api = await this.getApi();
    await api.deleteMemory(args.path);

    return {
      content: [
        {
          type: 'text',
          text: `Memory path ${args.path} deleted successfully.`,
        },
      ],
    };
  }

  private async handleMemorySegmentGet(args: any): Promise<CallToolResult> {
    if (typeof args?.segment !== 'number') {
      throw new Error('segment parameter is required');
    }

    const api = await this.getApi();
    const segment = await api.getMemorySegment(args.segment);

    return {
      content: [
        {
          type: 'text',
          text: `Memory Segment ${args.segment}:\n${segment.data}`,
        },
      ],
    };
  }

  private async handleMemorySegmentSet(args: any): Promise<CallToolResult> {
    if (typeof args?.segment !== 'number') {
      throw new Error('segment parameter is required');
    }
    if (args?.data === undefined || typeof args.data !== 'string') {
      throw new Error('data parameter is required');
    }

    const api = await this.getApi();
    await api.setMemorySegment(args.segment, args.data);

    return {
      content: [
        {
          type: 'text',
          text: `Memory segment ${args.segment} updated successfully.`,
        },
      ],
    };
  }

  async waitUntilReady(): Promise<void> {
    await this.apiReady;
  }

  private async getApi(): Promise<ScreepsAPI> {
    return this.apiReady;
  }
}
