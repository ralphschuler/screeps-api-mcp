import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ScreepsTools } from '../dist/tools.js';

class FakeScreepsAPI {
  constructor(config) {
    this.config = config;
    this.streamActive = false;
    this.history = [
      {
        line: 'console output',
        shard: config.shard,
        timestamp: Date.now(),
        type: 'log',
      },
    ];
    this.buffer = [...this.history];
    this.memory = {};
    this.segments = {};
  }

  async authenticate() {
    return;
  }

  getConnectionSummary(name) {
    return {
      name,
      host: this.config.host,
      secure: this.config.secure,
      shard: this.config.shard,
      authenticatedUser: 'tester',
      hasToken: Boolean(this.config.token),
      stream: this.streamActive
        ? {
            shard: this.config.shard,
            isActive: true,
            buffered: this.buffer.length,
          }
        : undefined,
    };
  }

  async executeConsoleCommand() {
    return { ok: 1, timestamp: 1234567890 };
  }

  async getConsoleHistory(limit) {
    return this.history.slice(-limit);
  }

  async startConsoleStream() {
    this.streamActive = true;
  }

  getConsoleStreamState() {
    return {
      shard: this.config.shard,
      isActive: this.streamActive,
      buffered: this.buffer.length,
    };
  }

  getBufferedConsoleMessages(limit) {
    return this.buffer.slice(-limit);
  }

  stopConsoleStream() {
    this.streamActive = false;
  }

  async getUserInfo() {
    return { _id: 'user1', username: 'tester' };
  }

  async getShardInfo() {
    return [{ name: 'shard0', tick: 123, players: 2, uptime: 0.99 }];
  }

  async getRoomObjects(roomName) {
    return [
      {
        _id: 'obj1',
        room: roomName,
        x: 1,
        y: 2,
        type: 'spawn',
      },
    ];
  }

  async getRoomTerrain(roomName) {
    return { roomName, terrain: [] };
  }

  async getMemory(path) {
    return this.memory[path] ?? null;
  }

  async setMemory(path, value) {
    this.memory[path] = value;
  }

  async deleteMemory(path) {
    delete this.memory[path];
  }

  async getMemorySegment(segment) {
    return { segment, data: this.segments[segment] ?? '' };
  }

  async setMemorySegment(segment, data) {
    this.segments[segment] = data;
  }
}

class FailingScreepsAPI extends FakeScreepsAPI {
  async getUserInfo() {
    throw new Error('Authentication failed');
  }
}

describe('ScreepsTools', () => {
  const config = {
    host: 'example.com',
    secure: true,
    shard: 'shard0',
    token: 'token',
  };

  let fakeApi;
  let tools;

  beforeEach(() => {
    fakeApi = new FakeScreepsAPI(config);
    tools = new ScreepsTools(config, {
      apiFactory: () => fakeApi,
      skipAuthentication: true,
    });
  });

  describe('getTools', () => {
    test('returns array of tool definitions', () => {
      const toolList = tools.getTools();

      assert.ok(Array.isArray(toolList));
      assert.strictEqual(toolList.length, 15);

      const expectedNames = [
        'screeps_connection_status',
        'screeps_console_command',
        'screeps_console_history',
        'screeps_console_stream_start',
        'screeps_console_stream_read',
        'screeps_console_stream_stop',
        'screeps_user_info',
        'screeps_shards_info',
        'screeps_room_objects',
        'screeps_room_terrain',
        'screeps_memory_get',
        'screeps_memory_set',
        'screeps_memory_delete',
        'screeps_memory_segment_get',
        'screeps_memory_segment_set',
      ];

      const toolNames = toolList.map(tool => tool.name);
      expectedNames.forEach(name => {
        assert.ok(toolNames.includes(name), `Should include tool: ${name}`);
      });
    });

    test('tools have correct schema structure', () => {
      const toolList = tools.getTools();

      toolList.forEach(tool => {
        assert.ok(typeof tool.name === 'string');
        assert.ok(typeof tool.description === 'string');
        assert.ok(tool.inputSchema);
        assert.strictEqual(tool.inputSchema.type, 'object');
        assert.ok(tool.inputSchema.properties);
      });
    });

    test('console command tool has required fields', () => {
      const toolList = tools.getTools();
      const consoleCommandTool = toolList.find(t => t.name === 'screeps_console_command');

      assert.ok(consoleCommandTool);
      assert.ok(consoleCommandTool.inputSchema.properties.command);
      assert.ok(consoleCommandTool.inputSchema.required.includes('command'));
    });

    test('room tools require room name', () => {
      const toolList = tools.getTools();
      const roomTools = ['screeps_room_objects', 'screeps_room_terrain'];

      roomTools.forEach(toolName => {
        const tool = toolList.find(t => t.name === toolName);
        assert.ok(tool);
        assert.ok(tool.inputSchema.properties.roomName);
        assert.ok(tool.inputSchema.required.includes('roomName'));
      });
    });

    test('memory segment tools have segment parameter', () => {
      const toolList = tools.getTools();
      const memoryTools = ['screeps_memory_segment_get', 'screeps_memory_segment_set'];

      memoryTools.forEach(toolName => {
        const tool = toolList.find(t => t.name === toolName);
        assert.ok(tool);
        assert.ok(tool.inputSchema.properties.segment);
        assert.ok(tool.inputSchema.required.includes('segment'));
      });
    });
  });

  describe('handleToolCall', () => {
    test('returns error for unknown tool', async () => {
      const result = await tools.handleToolCall('unknown_tool', {});

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes('Unknown tool'));
    });

    test('returns connection status information', async () => {
      const result = await tools.handleToolCall('screeps_connection_status', {});

      assert.strictEqual(result.isError, undefined);
      assert.ok(result.content[0].text.includes('Connection name'));
    });

    test('handles API errors gracefully', async () => {
      const failingTools = new ScreepsTools(config, {
        apiFactory: () => new FailingScreepsAPI(config),
        skipAuthentication: true,
      });

      const result = await failingTools.handleToolCall('screeps_user_info', {});

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes('Error:'));
    });
  });

  describe('tool validation', () => {
    test('tools no longer expose a connectionName parameter', () => {
      const toolList = tools.getTools();

      toolList.forEach(tool => {
        assert.ok(!tool.inputSchema.properties.connectionName);
      });
    });

    test('console history tool has proper limit constraints', () => {
      const toolList = tools.getTools();
      const historyTool = toolList.find(t => t.name === 'screeps_console_history');

      assert.ok(historyTool);
      const limitProp = historyTool.inputSchema.properties.limit;
      assert.strictEqual(limitProp.default, 20);
      assert.strictEqual(limitProp.minimum, 1);
      assert.strictEqual(limitProp.maximum, 200);
    });

    test('memory segment tools have proper constraints', () => {
      const toolList = tools.getTools();
      const memoryTools = toolList.filter(t => t.name.includes('memory_segment'));

      memoryTools.forEach(tool => {
        const segmentProp = tool.inputSchema.properties.segment;
        assert.strictEqual(segmentProp.minimum, 0);
        assert.strictEqual(segmentProp.maximum, 99);
      });
    });
  });
});
