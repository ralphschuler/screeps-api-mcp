import { z, ZodError } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Input sanitization utilities for security
 */
export class InputSanitizer {
  /**
   * Sanitizes string input by removing potentially dangerous characters
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitizes memory path to prevent directory traversal
   */
  static sanitizeMemoryPath(path: string): string {
    return path
      .replace(/\.\./g, '') // Remove directory traversal attempts
      .replace(/[<>:"|?*]/g, '') // Remove invalid path characters
      .trim();
  }

  /**
   * Sanitizes console command to prevent injection
   */
  static sanitizeConsoleCommand(command: string): string {
    // Basic sanitization - remove dangerous patterns but allow legitimate JS
    return command
      .replace(/require\s*\(/gi, '') // Remove require calls
      .replace(/process\./gi, '') // Remove process access
      .replace(/global\./gi, '') // Remove global access
      .trim();
  }
}

/**
 * Enhanced error handling for MCP tools
 */
export class ErrorHandler {
  /**
   * Formats validation errors into user-friendly messages
   */
  static formatValidationError(error: ZodError): CallToolResult {
    const issues = error.issues.map(issue => {
      const path = issue.path.length > 0 ? ` at '${issue.path.join('.')}'` : '';
      return `${issue.message}${path}`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `Validation Error:\n${issues.join('\n')}`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Formats API errors into structured responses
   */
  static formatApiError(error: Error, context?: string): CallToolResult {
    const contextText = context ? ` (${context})` : '';
    return {
      content: [
        {
          type: 'text',
          text: `API Error${contextText}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  /**
   * Formats generic errors with proper logging
   */
  static formatGenericError(error: unknown, context?: string): CallToolResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextText = context ? ` (${context})` : '';

    // Log error for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error${contextText}:`, error);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error${contextText}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Validates input against a Zod schema with enhanced error handling
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  context?: string
): { success: true; data: T } | { success: false; error: CallToolResult } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: ErrorHandler.formatValidationError(error) };
    }
    return { success: false, error: ErrorHandler.formatGenericError(error, context) };
  }
}

/**
 * Rate limiting utility for API calls
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Checks if a request should be allowed
   */
  allowRequest(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const requestTimes = this.requests.get(identifier)!;

    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Cleans up old entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requestTimes] of this.requests.entries()) {
      const validRequests = requestTimes.filter(time => time > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}
