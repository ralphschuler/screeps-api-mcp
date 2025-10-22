import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ScreepsAPI } from './screeps-api.js';
import { ConnectionConfig } from './types.js';

export class ScreepsTools {
  private connections = new Map<string, ScreepsAPI>();
  private defaultConnection?: ScreepsAPI;

  constructor(private connectionConfig?: ConnectionConfig) {
    // Connection will be initialized when first needed
  }

  private async initializeDefaultConnection(): Promise<void> {
    if (!this.connectionConfig) {
      throw new Error('No connection configuration provided');
    }

    if (this.defaultConnection) {
      return; // Already initialized
    }

    try {
      const api = new ScreepsAPI(this.connectionConfig);
      await api.authenticate();
      this.defaultConnection = api;
      this.connections.set('main', api);
      console.error(`Successfully connected to Screeps server at ${this.connectionConfig.host}`);
    } catch (error) {
      console.error(
        'Failed to connect to Screeps server:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  getTools(): Tool[] {
    return [
      {
        name: 'screeps_console_command',
        description: 'Execute a console command on the Screeps server',
        inputSchema: {
          type: 'object',
          properties: {
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
            command: {
              type: 'string',
              description: 'JavaScript code to execute in the Screeps console',
            },
            shard: {
              type: 'string',
              description: 'Shard to execute command on (optional, uses connection default)',
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
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to retrieve',
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
        },
      },
      {
        name: 'screeps_user_info',
        description: 'Get information about the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
          },
        },
      },
      {
        name: 'screeps_room_objects',
        description: 'Get objects in a specific room',
        inputSchema: {
          type: 'object',
          properties: {
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
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
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
            roomName: {
              type: 'string',
              description: 'Name of the room (e.g., "W1N1")',
            },
          },
          required: ['roomName'],
        },
      },
      {
        name: 'screeps_memory_segment_get',
        description: 'Get a memory segment from Screeps',
        inputSchema: {
          type: 'object',
          properties: {
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
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
            connectionName: {
              type: 'string',
              description: 'Name of the connection to use',
              default: 'main',
            },
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
        case 'screeps_console_command':
          return await this.handleConsoleCommand(args);
        case 'screeps_console_history':
          return await this.handleConsoleHistory(args);
        case 'screeps_user_info':
          return await this.handleUserInfo(args);
        case 'screeps_room_objects':
          return await this.handleRoomObjects(args);
        case 'screeps_room_terrain':
          return await this.handleRoomTerrain(args);
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

  private async handleConsoleCommand(args: any): Promise<CallToolResult> {
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);

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
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);
    const limit = args.limit || 20;

    const messages = await api.getConsoleHistory(limit);

    const formattedMessages = messages
      .map(
        msg => `[${msg.shard}] ${new Date(msg.timestamp || Date.now()).toISOString()}: ${msg.line}`
      )
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

  private async handleUserInfo(args: any): Promise<CallToolResult> {
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);

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

  private async handleRoomObjects(args: any): Promise<CallToolResult> {
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);

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
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);

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

  private async handleMemorySegmentGet(args: any): Promise<CallToolResult> {
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);

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
    const connectionName = args.connectionName || 'main';
    const api = await this.getConnection(connectionName);

    await api.setMemorySegment(args.segment, args.data);

    return {
      content: [
        {
          type: 'text',
          text: `Memory segment ${args.segment} updated successfully`,
        },
      ],
    };
  }

  private async getConnection(connectionName: string): Promise<ScreepsAPI> {
    // Initialize default connection if needed
    if (connectionName === 'main' && !this.connections.has('main') && this.connectionConfig) {
      await this.initializeDefaultConnection();
    }

    const api = this.connections.get(connectionName);
    if (!api) {
      throw new Error(
        `No connection found with name "${connectionName}". Server must be started with authentication parameters.`
      );
    }
    return api;
  }
}
