# Changelog

## [1.0.0] - 2024-10-21

### Added
- Initial release of Screeps API MCP Server
- Full MCP (Model Context Protocol) server implementation
- Support for connecting to Screeps servers (official and private)
- Authentication with username/password or API tokens
- Console command execution and history retrieval
- Room data access (objects and terrain)
- Memory segment management (read/write)
- User information retrieval
- WebSocket integration for real-time console monitoring
- Comprehensive documentation and examples
- Claude Desktop setup script
- TypeScript implementation with proper type safety
- Error handling and validation

### Tools Implemented
- `screeps_connect`: Connect to Screeps servers with authentication
- `screeps_console_command`: Execute JavaScript in the Screeps console
- `screeps_console_history`: Get recent console messages
- `screeps_user_info`: Retrieve user account information
- `screeps_room_objects`: Access objects in game rooms
- `screeps_room_terrain`: Get room terrain data
- `screeps_memory_segment_get`: Read memory segments
- `screeps_memory_segment_set`: Write to memory segments

### Documentation
- Complete README with installation and usage instructions
- Detailed example usage scenarios
- MCP client configuration examples
- Setup automation for Claude Desktop
- Comprehensive API documentation