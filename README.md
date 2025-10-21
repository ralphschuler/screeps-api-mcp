# Screeps API MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Screeps game servers. This server enables AI assistants and other MCP clients to connect to Screeps servers, execute console commands, retrieve game data, and manage memory segments.

## Features

- **Authentication**: Connect to Screeps servers using username/password or API tokens
- **Console Commands**: Execute JavaScript code in the Screeps console
- **Console History**: Retrieve recent console output and messages
- **Room Data**: Access room objects and terrain information
- **Memory Segments**: Read and write Screeps memory segments
- **User Information**: Get account details and statistics
- **Multiple Connections**: Manage connections to different servers (main, PTR, private servers)

## Installation

```bash
npm install -g screeps-api-mcp
```

Or run directly with npx:

```bash
npx screeps-api-mcp
```

## Usage

### Starting the Server

The MCP server communicates over stdio:

```bash
screeps-api-mcp
```

### Configuration with MCP Clients

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "screeps-api": {
      "command": "screeps-api-mcp"
    }
  }
}
```

### Available Tools

#### `screeps_connect`
Connect to a Screeps server with authentication.

**Parameters:**
- `connectionName` (string): Name for this connection (e.g., "main", "ptr")
- `host` (string): Server hostname (default: "screeps.com")
- `secure` (boolean): Use HTTPS/WSS (default: true)
- `username` (string): Screeps username (if not using token)
- `password` (string): Screeps password (if not using token)
- `token` (string): Screeps API token (alternative to username/password)
- `shard` (string): Default shard name (default: "shard0")

**Example:**
```
Connect to main server: screeps_connect with connectionName="main", username="myuser", password="mypass"
```

#### `screeps_console_command`
Execute JavaScript code in the Screeps console.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")
- `command` (string): JavaScript code to execute
- `shard` (string): Target shard (optional)

**Example:**
```
Execute console command: screeps_console_command with command="Game.time"
```

#### `screeps_console_history`
Retrieve recent console messages.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")
- `limit` (number): Max messages to retrieve (default: 20, max: 100)

#### `screeps_user_info`
Get information about the authenticated user.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")

#### `screeps_room_objects`
Get all objects in a specific room.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")
- `roomName` (string): Room name (e.g., "W1N1")

#### `screeps_room_terrain`
Get terrain data for a room.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")
- `roomName` (string): Room name (e.g., "W1N1")

#### `screeps_memory_segment_get`
Retrieve data from a memory segment.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")
- `segment` (number): Segment number (0-99)

#### `screeps_memory_segment_set`
Store data in a memory segment.

**Parameters:**
- `connectionName` (string): Connection to use (default: "main")
- `segment` (number): Segment number (0-99)
- `data` (string): Data to store

## Examples

### Basic Usage Flow

1. **Connect to Screeps:**
   ```
   screeps_connect with connectionName="main", username="myuser", password="mypass"
   ```

2. **Check your account:**
   ```
   screeps_user_info
   ```

3. **Execute console commands:**
   ```
   screeps_console_command with command="Memory.stats = { cpu: Game.cpu.getUsed() }"
   ```

4. **View console output:**
   ```
   screeps_console_history with limit=10
   ```

5. **Examine a room:**
   ```
   screeps_room_objects with roomName="E1S1"
   ```

### Working with Multiple Servers

```
# Connect to main server
screeps_connect with connectionName="main", username="user", password="pass"

# Connect to PTR
screeps_connect with connectionName="ptr", host="screeps.com/ptr", username="user", password="pass"

# Connect to private server
screeps_connect with connectionName="private", host="server.example.com", secure=false, username="user", password="pass"

# Use specific connections
screeps_console_command with connectionName="ptr", command="Game.time"
screeps_user_info with connectionName="private"
```

## API Token Authentication

For enhanced security, use API tokens instead of passwords:

1. Generate a token at https://screeps.com/a/#!/account/auth-tokens
2. Connect using the token:
   ```
   screeps_connect with connectionName="main", token="your-api-token-here"
   ```

## Error Handling

The server provides detailed error messages for:
- Authentication failures
- Invalid room names
- Network connectivity issues
- API rate limiting
- Malformed requests

## Development

### Building from Source

```bash
git clone https://github.com/ralphschuler/screeps-api-mcp.git
cd screeps-api-mcp
npm install
npm run build
```

### Running in Development

```bash
npm run dev  # Watch mode
npm start    # Run built version
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Related Projects

- [screeps_console](https://github.com/screepers/screeps_console) - Terminal console for Screeps
- [python-screeps](https://github.com/screepers/python-screeps) - Python Screeps API client
- [Model Context Protocol](https://github.com/anthropics/mcp) - MCP specification and SDKs