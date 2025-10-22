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

The MCP server communicates over stdio and requires authentication credentials to be provided on startup:

**Using API Token (recommended):**
```bash
screeps-api-mcp --token your-api-token-here
```

**Using Username/Password:**
```bash
screeps-api-mcp --username myuser --password mypass
```

**Using Environment Variables:**
```bash
export SCREEPS_TOKEN=your-api-token-here
screeps-api-mcp
```

**All CLI Options:**
```bash
screeps-api-mcp [options]

Options:
  --token <token>        Screeps API token
  --username <username>  Screeps username
  --password <password>  Screeps password
  --host <host>          Screeps server host (default: "screeps.com")
  --secure               Use HTTPS/WSS (default: true)
  --no-secure            Use HTTP/WS
  --shard <shard>        Default shard (default: "shard0")
  -h, --help             Display help
```

### Configuration with MCP Clients

Add to your MCP client configuration (e.g., Claude Desktop):

**Using API Token:**
```json
{
  "mcpServers": {
    "screeps-api": {
      "command": "screeps-api-mcp",
      "args": ["--token", "your-api-token-here"]
    }
  }
}
```

**Using Environment Variables:**
```json
{
  "mcpServers": {
    "screeps-api": {
      "command": "screeps-api-mcp",
      "env": {
        "SCREEPS_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Environment Variables

The following environment variables are supported:
- `SCREEPS_TOKEN` - Screeps API token
- `SCREEPS_USERNAME` - Screeps username  
- `SCREEPS_PASSWORD` - Screeps password
- `SCREEPS_HOST` - Server hostname (default: screeps.com)
- `SCREEPS_SECURE` - Use HTTPS/WSS (default: true)
- `SCREEPS_SHARD` - Default shard (default: shard0)

### Available Tools



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

1. **Start server with authentication:**
   ```bash
   screeps-api-mcp --token your-api-token-here
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

### Working with Different Servers

The server connects to a single Screeps server on startup. To work with different servers, start separate MCP server instances:

**Main Server:**
```bash
screeps-api-mcp --token your-token
```

**PTR Server:**
```bash
screeps-api-mcp --token your-token --host screeps.com/ptr
```

**Private Server:**
```bash
screeps-api-mcp --token your-token --host server.example.com --no-secure
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

### Testing

The project includes comprehensive test coverage:

```bash
npm test              # Run all tests
npm run test:coverage # Run tests with coverage report
npm run test:watch    # Run tests in watch mode
```

### Development Workflow

```bash
npm run dev          # Build in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm start           # Run built version
```

### Docker Development

Build and run with Docker:

```bash
# Build the image
docker build -t screeps-api-mcp .

# Run with environment variables
docker run --rm -e SCREEPS_TOKEN=your-token screeps-api-mcp --help

# Or use docker-compose
cp .env.example .env  # Edit with your credentials
docker-compose up screeps-api-mcp
```

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- **CI Pipeline** (`ci.yml`): Runs tests, linting, and builds on multiple Node.js versions
- **Docker Pipeline** (`docker.yml`): Builds and publishes Docker images to GitHub Container Registry
- **Release Pipeline** (`release.yml`): Automated releases with npm publishing and binary builds

All pushes and pull requests are automatically tested across Node.js 18, 20, and 22.

## Deployment

### Docker Deployment

**GitHub Container Registry (Recommended):**
```bash
docker pull ghcr.io/ralphschuler/screeps-api-mcp:latest
docker run --rm -e SCREEPS_TOKEN=your-token ghcr.io/ralphschuler/screeps-api-mcp:latest --help
```

**Using Docker Compose:**
```bash
# Copy and edit environment file
cp .env.example .env

# Run the service
docker-compose up -d screeps-api-mcp
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: screeps-api-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: screeps-api-mcp
  template:
    metadata:
      labels:
        app: screeps-api-mcp
    spec:
      containers:
      - name: screeps-api-mcp
        image: ghcr.io/ralphschuler/screeps-api-mcp:latest
        env:
        - name: SCREEPS_TOKEN
          valueFrom:
            secretKeyRef:
              name: screeps-credentials
              key: token
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
```

### Production Considerations

- Use API tokens instead of username/password for better security
- Set up monitoring and health checks
- Consider rate limiting when connecting to official Screeps servers
- Use container orchestration (Docker Swarm, Kubernetes) for high availability
- Configure log aggregation for debugging

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on development setup, testing, and submitting pull requests.

## Related Projects

- [screeps_console](https://github.com/screepers/screeps_console) - Terminal console for Screeps
- [python-screeps](https://github.com/screepers/python-screeps) - Python Screeps API client
- [Model Context Protocol](https://github.com/anthropics/mcp) - MCP specification and SDKs