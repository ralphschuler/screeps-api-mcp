import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ScreepsTools } from '../dist/tools.js';

describe('ScreepsTools', () => {
  let tools;

  beforeEach(() => {
    tools = new ScreepsTools();
  });

  describe('getTools', () => {
    test('returns array of tool definitions', () => {
      const toolList = tools.getTools();

      assert.ok(Array.isArray(toolList));
      assert.strictEqual(toolList.length, 7);

      const expectedNames = [
        'screeps_console_command',
        'screeps_console_history',
        'screeps_user_info',
        'screeps_room_objects',
        'screeps_room_terrain',
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

    test('returns error when no connection configured', async () => {
      const result = await tools.handleToolCall('screeps_user_info', {
        connectionName: 'main',
      });

      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes('No connection found with name "main"'));
    });

    test('handles connection errors gracefully', async () => {
      const config = {
        host: 'screeps.com',
        secure: true,
        token: 'invalid-token',
        shard: 'shard0',
      };
      const toolsWithConfig = new ScreepsTools(config);

      // This should fail authentication, but handle it gracefully
      const result = await toolsWithConfig.handleToolCall('screeps_user_info', {
        connectionName: 'main',
      });

      // Should return error result rather than throwing
      assert.strictEqual(result.isError, true);
      assert.ok(result.content);
      assert.ok(result.content[0].text);
    });
  });

  describe('tool validation', () => {
    test('all tools have connectionName parameter with default', () => {
      const toolList = tools.getTools();

      toolList.forEach(tool => {
        assert.ok(tool.inputSchema.properties.connectionName);
        assert.strictEqual(tool.inputSchema.properties.connectionName.default, 'main');
      });
    });

    test('console history tool has proper limit constraints', () => {
      const toolList = tools.getTools();
      const historyTool = toolList.find(t => t.name === 'screeps_console_history');

      assert.ok(historyTool);
      const limitProp = historyTool.inputSchema.properties.limit;
      assert.strictEqual(limitProp.default, 20);
      assert.strictEqual(limitProp.minimum, 1);
      assert.strictEqual(limitProp.maximum, 100);
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
