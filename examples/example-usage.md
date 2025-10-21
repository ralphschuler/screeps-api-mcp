# Example Usage of Screeps API MCP Server

This document provides practical examples of using the Screeps API MCP Server with various MCP clients.

## Basic Connection Examples

### Connecting to Official Servers

#### Main Server (screeps.com)
```
Tool: screeps_connect
Parameters:
- connectionName: "main"
- username: "your-username"
- password: "your-password"
```

#### PTR Server
```
Tool: screeps_connect
Parameters:
- connectionName: "ptr"
- host: "screeps.com/ptr"
- username: "your-username"
- password: "your-password"
```

#### Using API Token (Recommended)
```
Tool: screeps_connect
Parameters:
- connectionName: "main"
- token: "your-api-token-from-screeps"
```

### Private Server Example
```
Tool: screeps_connect
Parameters:
- connectionName: "private"
- host: "my-server.example.com:21025"
- secure: false
- username: "admin"
- password: "server-password"
```

## Console Command Examples

### Basic Commands
```
Tool: screeps_console_command
Parameters:
- command: "Game.time"
```

### Memory Management
```
Tool: screeps_console_command
Parameters:
- command: "JSON.stringify(Memory, null, 2)"
```

### Creep Information
```
Tool: screeps_console_command
Parameters:
- command: "Object.keys(Game.creeps).map(name => ({ name, role: Game.creeps[name].memory.role, room: Game.creeps[name].room.name }))"
```

### Room Status
```
Tool: screeps_console_command
Parameters:
- command: "Object.keys(Game.rooms).map(name => ({ name, rcl: Game.rooms[name].controller?.level, energy: Game.rooms[name].energyAvailable }))"
```

## Data Retrieval Examples

### Get User Statistics
```
Tool: screeps_user_info
Parameters:
- connectionName: "main"
```

### Examine Room Contents
```
Tool: screeps_room_objects
Parameters:
- roomName: "E1S1"
- connectionName: "main"
```

### Check Room Terrain
```
Tool: screeps_room_terrain
Parameters:
- roomName: "W5N5"
- connectionName: "main"
```

## Memory Segment Examples

### Store Configuration Data
```
Tool: screeps_memory_segment_set
Parameters:
- segment: 0
- data: '{"autoSpawn": true, "maxCreeps": 10, "strategy": "expand"}'
```

### Retrieve Configuration
```
Tool: screeps_memory_segment_get
Parameters:
- segment: 0
```

### Store Room Plans
```
Tool: screeps_memory_segment_set
Parameters:
- segment: 5
- data: '{"E1S1": {"layout": "bunker", "sources": 2, "controller": {"x": 25, "y": 25}}}'
```

## Monitoring and Debugging

### Check Recent Console Output
```
Tool: screeps_console_history
Parameters:
- limit: 50
- connectionName: "main"
```

### Debug Specific Creep
```
Tool: screeps_console_command
Parameters:
- command: "let creep = Game.creeps['Harvester1']; console.log(JSON.stringify({pos: creep.pos, memory: creep.memory, fatigue: creep.fatigue}, null, 2))"
```

### Monitor CPU Usage
```
Tool: screeps_console_command
Parameters:
- command: "console.log('CPU:', Game.cpu.getUsed(), '/', Game.cpu.limit, 'Bucket:', Game.cpu.bucket)"
```

## Multi-Server Workflow

### Setting Up Multiple Connections
```
1. Connect to main: screeps_connect with connectionName="main", token="main-token"
2. Connect to PTR: screeps_connect with connectionName="ptr", host="screeps.com/ptr", token="ptr-token"
3. Connect to private: screeps_connect with connectionName="private", host="private.server.com", username="user", password="pass"
```

### Compare Servers
```
1. Check main server: screeps_user_info with connectionName="main"
2. Check PTR: screeps_user_info with connectionName="ptr"
3. Execute same command on both:
   - screeps_console_command with connectionName="main", command="Game.time"
   - screeps_console_command with connectionName="ptr", command="Game.time"
```

## Advanced Examples

### Bulk Data Collection
```
Tool: screeps_console_command
Parameters:
- command: |
    let report = {
      time: Game.time,
      gcl: Game.gcl,
      rooms: Object.keys(Game.rooms).map(name => ({
        name,
        rcl: Game.rooms[name].controller?.level || 0,
        energy: Game.rooms[name].energyAvailable,
        energyCapacity: Game.rooms[name].energyCapacityAvailable,
        creepCount: Object.keys(Game.creeps).filter(c => Game.creeps[c].room.name === name).length
      })),
      creeps: Object.keys(Game.creeps).map(name => ({
        name,
        role: Game.creeps[name].memory.role,
        room: Game.creeps[name].room.name,
        ticksToLive: Game.creeps[name].ticksToLive
      }))
    };
    console.log(JSON.stringify(report, null, 2))
```

### Performance Monitoring
```
Tool: screeps_console_command
Parameters:
- command: |
    Memory.stats = Memory.stats || {};
    Memory.stats.cpu = {
      used: Game.cpu.getUsed(),
      limit: Game.cpu.limit,
      bucket: Game.cpu.bucket,
      timestamp: Game.time
    };
    console.log('Performance stats saved to Memory.stats')
```

## Error Handling Examples

Most tools will return detailed error messages. Common scenarios:

### Connection Errors
- Invalid credentials: "Authentication failed: 401 Unauthorized"
- Server unreachable: "API request failed: ENOTFOUND"
- Invalid token: "Authentication failed: Invalid token"

### API Errors
- Invalid room name: "Room not found or not visible"
- Rate limiting: "Too many requests, please wait"
- Invalid memory segment: "Segment number must be between 0 and 99"

### Usage Errors
- Missing connection: "No connection found with name 'xyz'. Please connect first using screeps_connect."
- Invalid command syntax: "SyntaxError in console command"

## Tips and Best Practices

1. **Use API tokens** instead of passwords for better security
2. **Test commands** on PTR before running on main server
3. **Use memory segments** for storing large configuration data
4. **Monitor console history** regularly to catch errors and warnings
5. **Keep connections named clearly** (main, ptr, private-server1, etc.)
6. **Use JSON.stringify()** with formatting for readable output
7. **Check Game.cpu.getUsed()** before expensive operations