import fetch from 'node-fetch';
import WebSocket from 'ws';
import { inflateSync } from 'zlib';
import {
  ConnectionConfig,
  ConsoleMessage,
  UserInfo,
  RoomObject,
  MemorySegment,
  ShardInfo,
  ConnectionSummary,
  ConsoleStreamState,
} from './types.js';

function isArrayOfStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export class ScreepsAPI {
  private config: ConnectionConfig;
  private token?: string;
  private userId?: string;
  private authenticatedUser?: string;
  private baseUrl: string;
  private consoleSocket?: WebSocket;
  private consoleBuffer: ConsoleMessage[] = [];
  private consoleShard?: string;
  private maxConsoleBuffer = 500;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.baseUrl = `${config.secure ? 'https' : 'http'}://${config.host}`;
    if (config.token) {
      this.token = config.token;
    }
  }

  async authenticate(): Promise<void> {
    if (this.token) {
      await this.getUserInfo();
      return;
    }

    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password required for authentication');
    }

    if (this.config.host === 'screeps.com' || this.config.host === 'screeps.com/ptr') {
      this.token = await this.generateAuthToken(this.config.username, this.config.password);
    } else {
      const response = await fetch(`${this.baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.config.username,
          password: this.config.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const authResult = (await response.json()) as { token: string };
      this.token = authResult.token;
    }

    await this.getUserInfo();
  }

  private async generateAuthToken(username: string, password: string): Promise<string> {
    const authtype = {
      type: 'full',
      endpoints: {
        'GET /api/user/name': false,
        'GET /api/user/money-history': false,
        'GET /api/market/my-orders': false,
        'GET /api/user/memory': false,
        'GET /api/user/memory-segment': false,
        'POST /api/user/memory-segment': false,
      },
      websockets: {
        console: false,
        rooms: false,
      },
      memorySegments: '',
    };

    const response = await fetch(`${this.baseUrl}/api/user/auth-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
      },
      body: JSON.stringify(authtype),
    });

    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.statusText}`);
    }

    const result = (await response.json()) as { token: string };
    return result.token;
  }

  async getUserInfo(): Promise<UserInfo> {
    const response = await this.apiRequest('/api/user/me');
    const userInfo = response as UserInfo;
    this.userId = userInfo._id;
    this.authenticatedUser = userInfo.username;
    return userInfo;
  }

  async getRoomObjects(roomName: string): Promise<RoomObject[]> {
    const response = await this.apiRequest(`/api/game/room-objects?room=${roomName}`);
    return (response as { objects: RoomObject[] }).objects || [];
  }

  async getRoomTerrain(roomName: string): Promise<{ terrain: string | number[] }> {
    const response = await this.apiRequest(`/api/game/room-terrain?room=${roomName}&encoded=1`);
    return response as { terrain: string | number[] };
  }

  async getMemorySegment(segment: number): Promise<MemorySegment> {
    const response = await this.apiRequest(`/api/user/memory-segment?segment=${segment}`);
    return {
      segment,
      data: (response as { data: string }).data || '',
    };
  }

  async setMemorySegment(segment: number, data: string): Promise<void> {
    await this.apiRequest('/api/user/memory-segment', 'POST', {
      segment,
      data,
    });
  }

  async getMemory(path: string): Promise<string | null> {
    const response = await this.apiRequest(`/api/user/memory?path=${encodeURIComponent(path)}`);
    const data = (response as { data?: string | null }).data;
    return typeof data === 'string' ? data : null;
  }

  async setMemory(path: string, value: string): Promise<void> {
    await this.apiRequest('/api/user/memory', 'POST', {
      path,
      value,
    });
  }

  async deleteMemory(path: string): Promise<void> {
    await this.apiRequest('/api/user/memory', 'POST', {
      path,
      value: null,
    });
  }

  async getShardInfo(): Promise<ShardInfo[]> {
    const response = await this.apiRequest('/api/game/shards/info');
    const shards = (response as { shards?: ShardInfo[] }).shards;
    return Array.isArray(shards) ? shards : [];
  }

  async executeConsoleCommand(
    command: string,
    shard?: string
  ): Promise<{ ok: number; timestamp: number }> {
    const targetShard = shard || this.config.shard;
    const response = await this.apiRequest('/api/user/console', 'POST', {
      expression: command,
      shard: targetShard,
    });
    return response as { ok: number; timestamp: number };
  }

  async getConsoleHistory(limit: number = 20): Promise<ConsoleMessage[]> {
    const response = await this.apiRequest(`/api/user/console?limit=${limit}`);
    
    interface ConsoleHistoryResponse {
      messages?: Array<{
        line?: string;
        message?: string;
        shard?: string;
        timestamp?: number;
        type?: string;
      }>;
    }
    
    const messages = (response as ConsoleHistoryResponse).messages || [];

    return messages.map(msg => ({
      line: msg.line || msg.message || '',
      shard: msg.shard || this.config.shard,
      timestamp: msg.timestamp || Date.now(),
      type: this.determineMessageType(msg),
    }));
  }

  async startConsoleStream(shard?: string, bufferSize?: number): Promise<void> {
    if (typeof bufferSize === 'number' && bufferSize > 0) {
      const clamped = Math.min(Math.max(bufferSize, 10), 5000);
      this.maxConsoleBuffer = clamped;
    }

    if (!this.token || !this.userId) {
      await this.authenticate();
    }

    const targetShard = shard || this.config.shard;
    this.consoleShard = targetShard;

    if (this.consoleSocket && this.consoleSocket.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${this.config.secure ? 'wss' : 'ws'}://${this.config.host}/socket/websocket`;
    const ws = new WebSocket(wsUrl);
    this.consoleSocket = ws;

    await new Promise<void>((resolve, reject) => {
      let resolved = false;

      const handleError = (error: Error) => {
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      };

      ws.once('error', handleError);
      ws.once('close', () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Console stream closed before authentication'));
        }
      });

      ws.on('open', () => {
        ws.send(`auth ${this.token}`);
      });

      ws.on('message', (data: WebSocket.RawData) => {
        const message = data.toString();

        if (message.startsWith('auth ok')) {
          ws.send(`subscribe user:${this.userId}/console`);
          if (!resolved) {
            resolved = true;
            resolve();
          }
          return;
        }

        if (!message.startsWith('time')) {
          this.handleConsoleSocketPayload(message);
        }
      });
    }).catch(error => {
      this.consoleSocket = undefined;
      ws.close();
      throw error;
    });
  }

  stopConsoleStream(): void {
    if (this.consoleSocket) {
      try {
        this.consoleSocket.close();
      } catch (error) {
        console.error('Error closing console stream:', error);
      }
    }
    this.consoleSocket = undefined;
  }

  getConsoleStreamState(): ConsoleStreamState {
    return {
      shard: this.consoleShard || this.config.shard,
      isActive: !!this.consoleSocket && this.consoleSocket.readyState === WebSocket.OPEN,
      buffered: this.consoleBuffer.length,
    };
  }

  getBufferedConsoleMessages(limit: number = 50, since?: number): ConsoleMessage[] {
    let messages = this.consoleBuffer;

    if (typeof since === 'number') {
      messages = messages.filter(msg => (msg.timestamp || 0) > since);
    }

    if (limit > 0) {
      messages = messages.slice(-limit);
    }

    return messages.map(msg => ({ ...msg }));
  }

  getConnectionSummary(name: string): ConnectionSummary {
    return {
      name,
      host: this.config.host,
      secure: this.config.secure,
      shard: this.config.shard,
      authenticatedUser: this.authenticatedUser,
      hasToken: Boolean(this.token || this.config.token),
      stream: this.consoleSocket ? this.getConsoleStreamState() : undefined,
    };
  }

  async close(): Promise<void> {
    this.stopConsoleStream();
  }

  private handleConsoleSocketPayload(message: string): void {
    interface SocketMessage {
      messages?: {
        log?: string[];
        results?: string[];
        errors?: string[];
        highlight?: string[];
      };
      shard?: string;
    }

    let parsedMessage: unknown;
    try {
      parsedMessage = this.parseSocketMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      return;
    }

    if (Array.isArray(parsedMessage) && parsedMessage.length > 1) {
      const messageData = parsedMessage[1] as SocketMessage;
      if (messageData && messageData.messages) {
        this.processConsoleMessages(messageData.messages, messageData.shard || this.consoleShard || this.config.shard);
      }
    }
  }

  private parseSocketMessage(message: string): unknown {
    if (message.startsWith('gz')) {
      const compressed = Buffer.from(message.substring(3), 'base64');
      const decompressed = inflateSync(compressed);
      return JSON.parse(decompressed.toString());
    }

    return JSON.parse(message);
  }

  private processConsoleMessages(
    messages: {
      log?: string[];
      results?: string[];
      errors?: string[];
      highlight?: string[];
    }, 
    shard: string
  ): void {
    const pushMessage = (line: string, type: ConsoleMessage['type']) => {
      const entry: ConsoleMessage = {
        line: this.stripHtmlTags(line),
        shard,
        timestamp: Date.now(),
        type,
      };
      this.consoleBuffer.push(entry);
      if (this.consoleBuffer.length > this.maxConsoleBuffer) {
        this.consoleBuffer = this.consoleBuffer.slice(-this.maxConsoleBuffer);
      }
    };

    if (messages.log && isArrayOfStrings(messages.log)) {
      messages.log.forEach((line: string) => pushMessage(line, 'log'));
    }

    if (messages.results && isArrayOfStrings(messages.results)) {
      messages.results.forEach((line: string) => pushMessage(line, 'result'));
    }

    if (messages.errors && isArrayOfStrings(messages.errors)) {
      messages.errors.forEach((line: string) => pushMessage(line, 'error'));
    }

    if (messages.highlight && isArrayOfStrings(messages.highlight)) {
      messages.highlight.forEach((line: string) => pushMessage(line, 'highlight'));
    }
  }

  private determineMessageType(message: { type?: string }): 'log' | 'result' | 'error' | 'highlight' {
    if (message.type === 'result') {
      return 'result';
    }
    if (message.type === 'error') {
      return 'error';
    }
    if (message.type === 'highlight') {
      return 'highlight';
    }
    return 'log';
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private async apiRequest(path: string, method: string = 'GET', body?: unknown): Promise<unknown> {
    if (!this.token) {
      await this.authenticate();
    }

    interface RequestOptions {
      method: string;
      headers: Record<string, string>;
      body?: string;
    }

    const options: RequestOptions = {
      method,
      headers: {
        'X-Token': this.token!,
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return {};
    }

    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { data: text };
    }
  }
}
