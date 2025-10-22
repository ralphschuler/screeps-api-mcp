# Example Usage of Screeps API MCP Server

This document provides practical examples of using the Screeps API MCP Server with various MCP clients.

## Starting the Server

The MCP server must be started with authentication credentials before it can be used.

### Official Servers

#### Main Server (screeps.com)
```bash
screeps-api-mcp --token your-api-token-here
# or
screeps-api-mcp --username your-username --password your-password
```

#### PTR Server
```bash
screeps-api-mcp --token your-api-token --host screeps.com/ptr
```

### Private Server Example
```bash
screeps-api-mcp --username admin --password server-password --host my-server.example.com:21025 --no-secure
```

### Using Environment Variables
```bash
export SCREEPS_TOKEN=your-api-token-here
screeps-api-mcp

# or for private server
export SCREEPS_USERNAME=admin
export SCREEPS_PASSWORD=server-password
export SCREEPS_HOST=my-server.example.com:21025
export SCREEPS_SECURE=false
screeps-api-mcp
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

### Setting Up Multiple Server Connections

Since the MCP server connects to a single Screeps server per instance, you'll need to run separate MCP server instances for different servers:

#### Terminal/Shell 1 - Main Server
```bash
screeps-api-mcp --token your-main-token
```

#### Terminal/Shell 2 - PTR Server  
```bash
screeps-api-mcp --token your-ptr-token --host screeps.com/ptr
```

#### Terminal/Shell 3 - Private Server
```bash
screeps-api-mcp --username user --password pass --host private.server.com --no-secure
```

### MCP Client Configuration for Multiple Servers
```json
{
  "mcpServers": {
    "screeps-main": {
      "command": "screeps-api-mcp",
      "args": ["--token", "your-main-token"]
    },
    "screeps-ptr": {
      "command": "screeps-api-mcp", 
      "args": ["--token", "your-ptr-token", "--host", "screeps.com/ptr"]
    },
    "screeps-private": {
      "command": "screeps-api-mcp",
      "args": ["--username", "user", "--password", "pass", "--host", "private.server.com", "--no-secure"]
    }
  }
}
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
- Missing connection: "No connection found with name 'xyz'. Server must be started with authentication parameters."
- Invalid command syntax: "SyntaxError in console command"

## Tips and Best Practices

1. **Use API tokens** instead of passwords for better security
2. **Test commands** on PTR before running on main server
3. **Use memory segments** for storing large configuration data
4. **Monitor console history** regularly to catch errors and warnings
5. **Keep connections named clearly** (main, ptr, private-server1, etc.)
6. **Use JSON.stringify()** with formatting for readable output
7. **Check Game.cpu.getUsed()** before expensive operations