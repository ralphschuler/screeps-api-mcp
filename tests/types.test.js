import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  ConnectionConfigSchema,
  ConsoleMessageSchema,
  UserInfoSchema,
  RoomObjectSchema,
  MemorySegmentSchema
} from '../dist/types.js';

describe('Types Module', () => {
  describe('ConnectionConfigSchema', () => {
    test('validates connection config with defaults', () => {
      const result = ConnectionConfigSchema.parse({});
      assert.strictEqual(result.host, 'screeps.com');
      assert.strictEqual(result.secure, true);
      assert.strictEqual(result.shard, 'shard0');
    });

    test('validates token authentication', () => {
      const config = { token: 'test-token' };
      const result = ConnectionConfigSchema.parse(config);
      assert.strictEqual(result.token, 'test-token');
    });

    test('validates username/password authentication', () => {
      const config = {
        username: 'testuser',
        password: 'testpass',
        host: 'private.server.com',
        secure: false
      };
      const result = ConnectionConfigSchema.parse(config);
      assert.strictEqual(result.username, 'testuser');
      assert.strictEqual(result.password, 'testpass');
      assert.strictEqual(result.host, 'private.server.com');
      assert.strictEqual(result.secure, false);
    });
  });

  describe('ConsoleMessageSchema', () => {
    test('validates basic console message', () => {
      const message = {
        line: 'console output',
        shard: 'shard0'
      };
      const result = ConsoleMessageSchema.parse(message);
      assert.strictEqual(result.line, 'console output');
      assert.strictEqual(result.shard, 'shard0');
    });

    test('validates message with all fields', () => {
      const message = {
        line: 'Game.time: 12345',
        shard: 'shard1',
        timestamp: 1635724800000,
        type: 'result'
      };
      const result = ConsoleMessageSchema.parse(message);
      assert.deepStrictEqual(result, message);
    });

    test('rejects invalid message type', () => {
      const message = {
        line: 'test',
        shard: 'shard0',
        type: 'invalid-type'
      };
      assert.throws(() => ConsoleMessageSchema.parse(message));
    });
  });

  describe('UserInfoSchema', () => {
    test('validates minimal user info', () => {
      const userInfo = { _id: 'user123', username: 'testplayer' };
      const result = UserInfoSchema.parse(userInfo);
      assert.strictEqual(result._id, 'user123');
      assert.strictEqual(result.username, 'testplayer');
    });

    test('validates complete user info', () => {
      const userInfo = {
        _id: 'user123',
        username: 'testplayer',
        gcl: { level: 5, progress: 150000, progressTotal: 200000 },
        credits: 1000
      };
      const result = UserInfoSchema.parse(userInfo);
      assert.deepStrictEqual(result, userInfo);
    });
  });

  describe('RoomObjectSchema', () => {
    test('validates room object', () => {
      const obj = {
        _id: 'obj123',
        room: 'W1N1',
        x: 25,
        y: 25,
        type: 'creep'
      };
      const result = RoomObjectSchema.parse(obj);
      assert.deepStrictEqual(result, obj);
    });

    test('validates room object with user', () => {
      const obj = {
        _id: 'obj456',
        room: 'E2S3',
        x: 10,
        y: 15,
        type: 'structure',
        user: 'player123'
      };
      const result = RoomObjectSchema.parse(obj);
      assert.deepStrictEqual(result, obj);
    });
  });

  describe('MemorySegmentSchema', () => {
    test('validates memory segment', () => {
      const segment = { segment: 0, data: '{"key": "value"}' };
      const result = MemorySegmentSchema.parse(segment);
      assert.deepStrictEqual(result, segment);
    });

    test('validates different segment numbers', () => {
      for (const segmentNum of [0, 50, 99]) {
        const segment = { segment: segmentNum, data: `segment ${segmentNum} data` };
        const result = MemorySegmentSchema.parse(segment);
        assert.strictEqual(result.segment, segmentNum);
      }
    });
  });
});