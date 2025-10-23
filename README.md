# Screeps API MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Screeps game servers. This server enables AI assistants and other MCP clients to connect to Screeps servers, execute console commands, retrieve game data, and manage memory segments.

## Features

- **Authentication**: Connect to Screeps servers using username/password or API tokens
- **Secure Connection Initialization**: Provide credentials once at startup to establish the single connection used by all tools
- **Console Commands & History**: Execute JavaScript commands and retrieve recent console output
- **Live Console Streaming**: Start, read, and stop a persistent websocket console stream with in-memory buffering
- **Memory Access**: Read/write/delete arbitrary `Memory` paths and manage memory segments
- **Room & Shard Data**: Access room objects, terrain information, and shard metadata
- **User Information**: Get account details and statistics for the authenticated player

## Installation (GitHub Packages)

This project is published via [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), so npm must be configured to pull the `@ralfschuler` scope from `npm.pkg.github.com`. If you have not already, create (or update) your `~/.npmrc` with a Personal Access Token that has the `read:packages` scope:

```bash
npm config set @ralfschuler:registry https://npm.pkg.github.com
echo "//npm.pkg.github.com/:_authToken=${GITHUB_PAT}" >> ~/.npmrc
```

> **Note:** replace `GITHUB_PAT` with a GitHub Personal Access Token that includes the `read:packages` scope.

After configuration, install the CLI globally to place the `screeps-api-mcp` executable on your path:

```bash
npm install -g @ralfschuler/screeps-api-mcp
```

### Running with npx

To execute the server without a global install, ensure the GitHub Packages registry configuration above is in place and then run:

```bash
npx @ralfschuler/screeps-api-mcp --token your-api-token-here
```

All of the CLI options shown below apply when running via `npx` as well.

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

#### `screeps_connection_status`
Show connection details for the configured Screeps server, including console stream state.

**Parameters:**
- _None_

#### `screeps_console_command`
Execute JavaScript code in the Screeps console.

**Parameters:**
- `command` (string): JavaScript code to execute
- `shard` (string): Target shard override (optional)

#### `screeps_console_history`
Retrieve recent console messages.

**Parameters:**
- `limit` (number): Max messages to retrieve (default: 20, max: 200)

#### `screeps_console_stream_start`
Open a persistent websocket console stream and buffer messages in memory.

**Parameters:**
- `shard` (string): Optional shard override
- `bufferSize` (number): Max buffered messages (default: 500)

#### `screeps_console_stream_read`
Read buffered console messages captured by the live stream.

**Parameters:**
- `limit` (number): Max messages to return (default: 50, max: 500)
- `since` (number): Only include messages newer than this timestamp (ms)

#### `screeps_console_stream_stop`
Stop the live console stream and release the websocket connection.

**Parameters:**
- _None_

#### `screeps_user_info`
Get information about the authenticated user.

**Parameters:**
- _None_

#### `screeps_shards_info`
Fetch shard metadata from the server.

**Parameters:**
- _None_

#### `screeps_room_objects`
Get all objects in a specific room.

**Parameters:**
- `roomName` (string): Room name (e.g., "W1N1")

#### `screeps_room_terrain`
Get terrain data for a room.

**Parameters:**
- `roomName` (string): Room name (e.g., "W1N1")

#### `screeps_memory_get`
Read a value from the Screeps `Memory` object.

**Parameters:**
- `path` (string): Memory path (e.g., "stats.cpu")

#### `screeps_memory_set`
Write a value into the Screeps `Memory` object.

**Parameters:**
- `path` (string): Memory path
- `value` (string): Stringified JSON or raw string value to store

#### `screeps_memory_delete`
Remove a value from the Screeps `Memory` object.

**Parameters:**
- `path` (string): Memory path to delete

#### `screeps_memory_segment_get`
Retrieve data from a memory segment.

**Parameters:**
- `segment` (number): Segment number (0-99)

#### `screeps_memory_segment_set`
Store data in a memory segment.

**Parameters:**
- `segment` (number): Segment number (0-99)
- `data` (string): Data to store

## Examples

### Basic Usage Flow

1. **Start the MCP server:**
   ```bash
   screeps-api-mcp --token your-api-token-here
   ```

2. **Verify the authenticated connection:**
   ```
   screeps_connection_status
   ```

3. **Start a live console stream and begin buffering logs:**
   ```
   screeps_console_stream_start with bufferSize=500
   ```

4. **Execute console commands:**
   ```
   screeps_console_command with command="Memory.stats = { cpu: Game.cpu.getUsed() }"
   ```

5. **Read the buffered stream output or request history:**
   ```
   screeps_console_stream_read with limit=20
   ```
   ```
   screeps_console_history with limit=20
   ```

6. **Inspect rooms or memory:**
   ```
   screeps_room_objects with roomName="E1S1"
   ```
   ```
   screeps_memory_get with path="stats"
   ```

## API Token Authentication

For enhanced security, use API tokens instead of passwords:

1. Generate a token at https://screeps.com/a/#!/account/auth-tokens
2. Start the MCP server with the token:
   ```bash
   screeps-api-mcp --token your-api-token-here
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