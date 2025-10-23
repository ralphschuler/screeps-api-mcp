import { describe, test } from 'node:test';
import assert from 'node:assert';
import { ScreepsAPI } from '../dist/screeps-api.js';
import { ScreepsTools } from '../dist/tools.js';

function createToolsInstance(config) {
  const baseConfig = {
    host: 'screeps.com',
    secure: true,
    shard: 'shard0',
    token: 'test-token',
  };

  const finalConfig = { ...baseConfig, ...config };

  return new ScreepsTools(finalConfig, {
    skipAuthentication: true,
    apiFactory: cfg => ({
      getConnectionSummary: () => ({
        name: 'default',
        host: cfg.host,
        secure: cfg.secure,
        shard: cfg.shard,
        authenticatedUser: 'tester',
        hasToken: Boolean(cfg.token),
      }),
      executeConsoleCommand: async () => ({ ok: 1, timestamp: Date.now() }),
      getConsoleHistory: async () => [],
      startConsoleStream: async () => {},
      getConsoleStreamState: () => ({ shard: cfg.shard, isActive: false, buffered: 0 }),
      getBufferedConsoleMessages: () => [],
      stopConsoleStream: () => {},
      getUserInfo: async () => ({ _id: 'user1', username: 'tester' }),
      getShardInfo: async () => [],
      getRoomObjects: async () => [],
      getRoomTerrain: async () => ({}),
      getMemory: async () => null,
      setMemory: async () => {},
      deleteMemory: async () => {},
      getMemorySegment: async segment => ({ segment, data: '' }),
      setMemorySegment: async () => {},
    }),
  });
}

describe('Basic Module Tests', () => {
  describe('ScreepsAPI', () => {
    test('can be instantiated with config', () => {
      const config = {
        host: 'screeps.com',
        secure: true,
        token: 'test-token',
        shard: 'shard0',
      };

      const api = new ScreepsAPI(config);
      assert.ok(api);
    });

    test('can be instantiated with insecure config', () => {
      const config = {
        host: 'localhost:8080',
        secure: false,
        username: 'test',
        password: 'test',
        shard: 'shard0',
      };

      const api = new ScreepsAPI(config);
      assert.ok(api);
    });

    test('has required methods', () => {
      const config = {
        host: 'screeps.com',
        secure: true,
        token: 'test-token',
        shard: 'shard0',
      };

      const api = new ScreepsAPI(config);

      // Check that methods exist and are functions
      assert.strictEqual(typeof api.authenticate, 'function');
      assert.strictEqual(typeof api.getUserInfo, 'function');
      assert.strictEqual(typeof api.executeConsoleCommand, 'function');
      assert.strictEqual(typeof api.getConsoleHistory, 'function');
      assert.strictEqual(typeof api.getRoomObjects, 'function');
      assert.strictEqual(typeof api.getRoomTerrain, 'function');
      assert.strictEqual(typeof api.getMemorySegment, 'function');
      assert.strictEqual(typeof api.setMemorySegment, 'function');
    });
  });

  describe('ScreepsTools', () => {
    test('throws when instantiated without config', () => {
      assert.throws(() => {
        // @ts-expect-error intentional invalid usage for runtime check
        new ScreepsTools();
      });
    });

    test('can be instantiated with config', () => {
      const config = {
        host: 'screeps.com',
        secure: true,
        token: 'test-token',
        shard: 'shard0',
      };

      const tools = createToolsInstance(config);
      assert.ok(tools);
    });

    test('has required methods', () => {
      const tools = createToolsInstance();

      assert.strictEqual(typeof tools.getTools, 'function');
      assert.strictEqual(typeof tools.handleToolCall, 'function');
    });

    test('getTools returns consistent results', () => {
      const tools = createToolsInstance();

      const tools1 = tools.getTools();
      const tools2 = tools.getTools();

      assert.strictEqual(tools1.length, tools2.length);
      assert.deepStrictEqual(tools1.map(t => t.name).sort(), tools2.map(t => t.name).sort());
    });
  });

  describe('Module Imports', () => {
    test('all exports are available', async () => {
      // Test that we can import all the main modules
      const typesModule = await import('../dist/types.js');
      const toolsModule = await import('../dist/tools.js');
      const apiModule = await import('../dist/screeps-api.js');

      assert.ok(typesModule.ConnectionConfigSchema);
      assert.ok(typesModule.ConsoleMessageSchema);
      assert.ok(typesModule.UserInfoSchema);
      assert.ok(typesModule.RoomObjectSchema);
      assert.ok(typesModule.MemorySegmentSchema);

      assert.ok(toolsModule.ScreepsTools);
      assert.ok(apiModule.ScreepsAPI);
    });

    test('main index module builds correctly', async () => {
      // Just verify the build produced the index.js file
      // We can't import it as it's a CLI entry point that calls process.exit
      const fs = await import('fs');
      const path = await import('path');
      const indexPath = path.join(process.cwd(), 'dist', 'index.js');
      assert.ok(fs.existsSync(indexPath), 'index.js should be built');
    });
  });

  describe('Configuration Validation', () => {
    test('validates different connection configurations', () => {
      const configs = [
        { host: 'screeps.com', secure: true, token: 'token' },
        { host: 'screeps.com', secure: true, username: 'user', password: 'pass' },
        { host: 'private.com', secure: false, token: 'token' },
        { host: 'localhost:8080', secure: false, username: 'admin', password: 'admin' },
      ];

      configs.forEach((config, index) => {
        assert.doesNotThrow(() => {
          new ScreepsAPI({ ...config, shard: 'shard0' });
        }, `Config ${index} should be valid`);

        assert.doesNotThrow(() => {
          createToolsInstance({ ...config, shard: 'shard0' });
        }, `Config ${index} should work with tools`);
      });
    });
  });
});
