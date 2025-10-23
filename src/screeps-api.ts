import fetch from 'node-fetch';
import WebSocket from 'ws';
import { ConnectionConfig, ConsoleMessage, UserInfo, RoomObject, MemorySegment } from './types.js';

export class ScreepsAPI {
  private config: ConnectionConfig;
  private token?: string;
  private userId?: string;
  private baseUrl: string;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.baseUrl = `${config.secure ? 'https' : 'http'}://${config.host}`;
  }

  async authenticate(): Promise<void> {
    if (this.config.token) {
      this.token = this.config.token;
      await this.getUserInfo();
      return;
    }

    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password required for authentication');
    }

    // For screeps.com, we need to generate an auth token
    if (this.config.host === 'screeps.com' || this.config.host === 'screeps.com/ptr') {
      this.token = await this.generateAuthToken(this.config.username, this.config.password);
    } else {
      // For other servers, try direct authentication
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

    // Get user info to get user ID
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
    return userInfo;
  }

  async getRoomObjects(roomName: string): Promise<RoomObject[]> {
    const response = await this.apiRequest(`/api/game/room-objects?room=${roomName}`);
    return (response as { objects: RoomObject[] }).objects || [];
  }

  async getRoomTerrain(roomName: string): Promise<any> {
    const response = await this.apiRequest(`/api/game/room-terrain?room=${roomName}&encoded=1`);
    return response;
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
    const messages = (response as { messages: any[] }).messages || [];

    return messages.map(msg => ({
      line: msg.line || msg.message || '',
      shard: msg.shard || this.config.shard,
      timestamp: msg.timestamp || Date.now(),
      type: this.determineMessageType(msg),
    }));
  }

  createConsoleStream(): WebSocket {
    if (!this.token || !this.userId) {
      throw new Error('Must be authenticated before creating console stream');
    }

    const wsUrl = `${this.config.secure ? 'wss' : 'ws'}://${this.config.host}/socket/websocket`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      // Authenticate with websocket
      ws.send(`auth ${this.token}`);
    });

    ws.on('message', (data: Buffer) => {
      const message = data.toString();

      if (message.startsWith('auth ok')) {
        // Subscribe to console messages
        ws.send(`subscribe user:${this.userId}/console`);
        return;
      }

      if (message.startsWith('time')) {
        return;
      }

      // Handle compressed messages
      let parsedMessage;
      try {
        if (message.startsWith('gz')) {
          const compressed = Buffer.from(message.substring(3), 'base64');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const zlib = require('zlib');
          const decompressed = zlib.inflateSync(compressed);
          parsedMessage = JSON.parse(decompressed.toString());
        } else {
          parsedMessage = JSON.parse(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        return;
      }

      // Emit console messages
      if (parsedMessage && Array.isArray(parsedMessage) && parsedMessage.length > 1) {
        const messageData = parsedMessage[1];
        if (messageData && messageData.messages) {
          this.processConsoleMessages(messageData.messages, messageData.shard || this.config.shard);
        }
      }
    });

    return ws;
  }

  private async apiRequest(path: string, method: string = 'GET', body?: any): Promise<any> {
    if (!this.token) {
      await this.authenticate();
    }

    const options: any = {
      method,
      headers: {
        'X-Token': this.token,
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

    return await response.json();
  }

  private determineMessageType(message: any): 'log' | 'result' | 'error' | 'highlight' {
    if (message.type === 'result') {return 'result';}
    if (message.type === 'error') {return 'error';}
    if (message.type === 'highlight') {return 'highlight';}
    return 'log';
  }

  private processConsoleMessages(messages: any, shard: string): void {
    // This would emit events that the MCP server can listen to
    // For now, we'll just log them
    if (messages.log) {
      messages.log.forEach((line: string) => {
        console.log(`${shard}: ${this.stripHtmlTags(line)}`);
      });
    }

    if (messages.results) {
      messages.results.forEach((line: string) => {
        console.log(`${shard}: [RESULT] ${this.stripHtmlTags(line)}`);
      });
    }
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}
