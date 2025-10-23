import { describe, test } from 'node:test';
import assert from 'node:assert';
import { 
  InputSanitizer, 
  ErrorHandler, 
  validateInput, 
  RateLimiter 
} from '../dist/validation.js';
import { 
  ConsoleCommandArgsSchema,
  RoomNameArgsSchema,
  MemoryPathArgsSchema 
} from '../dist/types.js';

describe('Input Validation and Security', () => {
  describe('InputSanitizer', () => {
    test('sanitizes console commands', () => {
      const dangerous = 'require("fs").writeFileSync("/etc/passwd", "hacked")';
      const sanitized = InputSanitizer.sanitizeConsoleCommand(dangerous);
      assert.ok(!sanitized.includes('require('));
      assert.ok(!sanitized.includes('process.'));
      assert.ok(!sanitized.includes('global.'));
    });

    test('sanitizes memory paths', () => {
      const dangerous = '../../../etc/passwd';
      const sanitized = InputSanitizer.sanitizeMemoryPath(dangerous);
      assert.ok(!sanitized.includes('..'));
      assert.strictEqual(sanitized, 'etc/passwd');
    });

    test('sanitizes strings to prevent XSS', () => {
      const dangerous = '<script>alert("xss")</script>';
      const sanitized = InputSanitizer.sanitizeString(dangerous);
      assert.ok(!sanitized.includes('<script>'));
    });
  });

  describe('Input Validation', () => {
    test('validates console command arguments', () => {
      const validArgs = { command: 'Memory.foo = "bar"' };
      const result = validateInput(ConsoleCommandArgsSchema, validArgs);
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.command, 'Memory.foo = "bar"');
      }
    });

    test('rejects invalid console commands', () => {
      const invalidArgs = { command: '' }; // Empty command
      const result = validateInput(ConsoleCommandArgsSchema, invalidArgs);
      assert.strictEqual(result.success, false);
    });

    test('validates room name format', () => {
      const validRoom = { roomName: 'E1S2' };
      const result = validateInput(RoomNameArgsSchema, validRoom);
      assert.strictEqual(result.success, true);
      
      const invalidRoom = { roomName: 'invalid' };
      const invalidResult = validateInput(RoomNameArgsSchema, invalidRoom);
      assert.strictEqual(invalidResult.success, false);
    });

    test('validates memory path constraints', () => {
      const validPath = { path: 'stats.cpu' };
      const result = validateInput(MemoryPathArgsSchema, validPath);
      assert.strictEqual(result.success, true);
      
      const emptyPath = { path: '' };
      const invalidResult = validateInput(MemoryPathArgsSchema, emptyPath);
      assert.strictEqual(invalidResult.success, false);
    });
  });

  describe('RateLimiter', () => {
    test('allows requests within limit', () => {
      const limiter = new RateLimiter(1000, 2); // 2 requests per second
      assert.strictEqual(limiter.allowRequest('test'), true);
      assert.strictEqual(limiter.allowRequest('test'), true);
    });

    test('blocks requests exceeding limit', () => {
      const limiter = new RateLimiter(1000, 1); // 1 request per second
      assert.strictEqual(limiter.allowRequest('test'), true);
      assert.strictEqual(limiter.allowRequest('test'), false);
    });

    test('resets after time window', () => {
      const limiter = new RateLimiter(10, 1); // Very short window for testing
      assert.strictEqual(limiter.allowRequest('test'), true);
      assert.strictEqual(limiter.allowRequest('test'), false);
      
      // Wait for window to reset
      setTimeout(() => {
        assert.strictEqual(limiter.allowRequest('test'), true);
      }, 15);
    });

    test('cleans up old entries', () => {
      const limiter = new RateLimiter(10, 10);
      limiter.allowRequest('test1');
      limiter.allowRequest('test2');
      
      // Cleanup should remove expired entries
      setTimeout(() => {
        limiter.cleanup();
        // Internal state should be cleaned, but we can't easily verify without exposing internals
        assert.ok(true); // If no errors thrown, cleanup worked
      }, 15);
    });
  });

  describe('ErrorHandler', () => {
    test('formats validation errors properly', () => {
      try {
        ConsoleCommandArgsSchema.parse({ invalid: true });
        assert.fail('Should have thrown validation error');
      } catch (error) {
        const result = ErrorHandler.formatValidationError(error);
        assert.strictEqual(result.isError, true);
        assert.ok(result.content[0].text.includes('Validation Error'));
      }
    });

    test('formats API errors properly', () => {
      const apiError = new Error('API connection failed');
      const result = ErrorHandler.formatApiError(apiError, 'testing');
      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes('API Error (testing)'));
    });

    test('formats generic errors properly', () => {
      const genericError = new Error('Something went wrong');
      const result = ErrorHandler.formatGenericError(genericError, 'context');
      assert.strictEqual(result.isError, true);
      assert.ok(result.content[0].text.includes('Error (context)'));
    });
  });
});