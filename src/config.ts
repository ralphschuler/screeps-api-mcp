import { ConnectionConfig, ConnectionConfigSchema } from './types.js';

/**
 * Configuration management following MCP best practices
 */
export class ConfigManager {
  /**
   * Loads and validates configuration from environment variables and CLI args
   */
  static loadConfig(cliOptions: Partial<ConnectionConfig>): ConnectionConfig {
    // Merge CLI options with environment variables (CLI takes precedence)
    const config: Partial<ConnectionConfig> = {
      host: cliOptions.host || process.env.SCREEPS_HOST || 'screeps.com',
      secure:
        cliOptions.secure !== undefined
          ? cliOptions.secure
          : process.env.SCREEPS_SECURE !== 'false',
      username: cliOptions.username || process.env.SCREEPS_USERNAME,
      password: cliOptions.password || process.env.SCREEPS_PASSWORD,
      token: cliOptions.token || process.env.SCREEPS_TOKEN,
      shard: cliOptions.shard || process.env.SCREEPS_SHARD || 'shard0',
    };

    // Validate the configuration
    try {
      return ConnectionConfigSchema.parse(config);
    } catch (error) {
      throw new Error(
        `Invalid configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validates authentication credentials
   */
  static validateCredentials(config: ConnectionConfig): void {
    const hasToken = Boolean(config.token);
    const hasUsernamePassword = Boolean(config.username && config.password);

    if (!hasToken && !hasUsernamePassword) {
      throw new Error(
        'Authentication required: Must provide either --token or both --username and --password ' +
          '(or use environment variables SCREEPS_TOKEN, SCREEPS_USERNAME, SCREEPS_PASSWORD)'
      );
    }
  }

  /**
   * Gets environment-specific settings
   */
  static getEnvironmentSettings() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTesting = process.env.NODE_ENV === 'test';
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      isDevelopment,
      isTesting,
      isProduction,
      logLevel: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      enableMetrics: process.env.ENABLE_METRICS === 'true' || isProduction,
      enableDetailedErrors: isDevelopment || isTesting,
    };
  }

  /**
   * Sanitizes configuration for logging (removes sensitive data)
   */
  static sanitizeForLogging(config: ConnectionConfig): Partial<ConnectionConfig> {
    return {
      host: config.host,
      secure: config.secure,
      shard: config.shard,
      username: config.username ? '[REDACTED]' : undefined,
      password: config.password ? '[REDACTED]' : undefined,
      token: config.token ? '[REDACTED]' : undefined,
    };
  }
}

/**
 * Logger with configurable levels following MCP best practices
 */
export class Logger {
  private static level: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private static enableDetailedErrors = false;

  static configure(level: string, enableDetailedErrors = false): void {
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      this.level = level as typeof this.level;
    }
    this.enableDetailedErrors = enableDetailedErrors;
  }

  static debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.error(`[INFO] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.error(`[WARN] ${message}`, ...args);
    }
  }

  static error(message: string, error?: Error | unknown): void {
    if (this.shouldLog('error')) {
      if (error instanceof Error && this.enableDetailedErrors) {
        console.error(`[ERROR] ${message}`, error.stack || error.message);
      } else {
        console.error(`[ERROR] ${message}`, error);
      }
    }
  }

  private static shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}
