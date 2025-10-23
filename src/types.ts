import { z } from 'zod';

// Screeps API connection settings
export const ConnectionConfigSchema = z.object({
  host: z.string().default('screeps.com'),
  secure: z.boolean().default(true),
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  shard: z.string().default('shard0'),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

// Console message types
export const ConsoleMessageSchema = z.object({
  line: z.string(),
  shard: z.string(),
  timestamp: z.number().optional(),
  type: z.enum(['log', 'result', 'error', 'highlight']).optional(),
});

export type ConsoleMessage = z.infer<typeof ConsoleMessageSchema>;

// Console streaming buffer summary
export interface ConsoleStreamState {
  shard: string;
  isActive: boolean;
  buffered: number;
}

// Screeps API response types
export const UserInfoSchema = z.object({
  _id: z.string(),
  username: z.string(),
  badge: z.object({}).optional(),
  gcl: z
    .object({
      level: z.number(),
      progress: z.number(),
      progressTotal: z.number(),
    })
    .optional(),
  credits: z.number().optional(),
  lastRespawnDate: z.number().optional(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

export const RoomObjectSchema = z.object({
  _id: z.string(),
  room: z.string(),
  x: z.number(),
  y: z.number(),
  type: z.string(),
  user: z.string().optional(),
});

export type RoomObject = z.infer<typeof RoomObjectSchema>;

export const MemorySegmentSchema = z.object({
  segment: z.number(),
  data: z.string(),
});

export type MemorySegment = z.infer<typeof MemorySegmentSchema>;

export const ShardInfoSchema = z.object({
  name: z.string(),
  tick: z.number().optional(),
  players: z.number().optional(),
  uptime: z.number().optional(),
});

export type ShardInfo = z.infer<typeof ShardInfoSchema>;

export interface ConnectionSummary {
  name: string;
  host: string;
  secure: boolean;
  shard: string;
  authenticatedUser?: string;
  hasToken: boolean;
  stream?: ConsoleStreamState;
}

// Tool parameter schemas for input validation
export const ConsoleCommandArgsSchema = z.object({
  command: z.string().min(1).max(10000),
  shard: z.string().optional(),
});

export const ConsoleHistoryArgsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(20),
});

export const ConsoleStreamStartArgsSchema = z.object({
  shard: z.string().optional(),
  bufferSize: z.number().int().min(10).max(5000).optional().default(500),
});

export const ConsoleStreamReadArgsSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
  since: z.number().int().positive().optional(),
});

export const RoomNameArgsSchema = z.object({
  roomName: z.string().regex(/^[EW]\d+[NS]\d+$/, 'Invalid room name format'),
});

export const MemoryPathArgsSchema = z.object({
  path: z.string().min(1).max(500),
});

export const MemorySetArgsSchema = z.object({
  path: z.string().min(1).max(500),
  value: z.string().max(100000),
});

export const MemorySegmentArgsSchema = z.object({
  segment: z.number().int().min(0).max(99),
});

export const MemorySegmentSetArgsSchema = z.object({
  segment: z.number().int().min(0).max(99),
  data: z.string().max(100000),
});

export type ConsoleCommandArgs = z.infer<typeof ConsoleCommandArgsSchema>;
export type ConsoleHistoryArgs = z.infer<typeof ConsoleHistoryArgsSchema>;
export type ConsoleStreamStartArgs = z.infer<typeof ConsoleStreamStartArgsSchema>;
export type ConsoleStreamReadArgs = z.infer<typeof ConsoleStreamReadArgsSchema>;
export type RoomNameArgs = z.infer<typeof RoomNameArgsSchema>;
export type MemoryPathArgs = z.infer<typeof MemoryPathArgsSchema>;
export type MemorySetArgs = z.infer<typeof MemorySetArgsSchema>;
export type MemorySegmentArgs = z.infer<typeof MemorySegmentArgsSchema>;
export type MemorySegmentSetArgs = z.infer<typeof MemorySegmentSetArgsSchema>;
