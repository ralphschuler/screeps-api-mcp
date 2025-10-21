#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Setup script to add Screeps API MCP server to Claude Desktop configuration
 */

const CLAUDE_CONFIG_PATH = join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
const CLAUDE_CONFIG_PATH_WIN = join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');

function getClaudeConfigPath() {
  if (process.platform === 'win32') {
    return CLAUDE_CONFIG_PATH_WIN;
  }
  return CLAUDE_CONFIG_PATH;
}

function setupClaude() {
  const configPath = getClaudeConfigPath();
  
  console.log('Setting up Screeps API MCP Server for Claude Desktop...');
  console.log(`Config path: ${configPath}`);

  let config = {};
  
  // Read existing config if it exists
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf8');
      config = JSON.parse(content);
      console.log('Found existing Claude config');
    } catch (error) {
      console.warn('Could not parse existing config, creating new one');
    }
  } else {
    console.log('Creating new Claude config');
  }

  // Ensure mcpServers section exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Add screeps-api server
  config.mcpServers['screeps-api'] = {
    command: 'screeps-api-mcp'
  };

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Successfully configured Claude Desktop to use Screeps API MCP Server');
    console.log('\nNext steps:');
    console.log('1. Restart Claude Desktop');
    console.log('2. Use the screeps_connect tool to connect to your Screeps server');
    console.log('3. Start using Screeps API tools in your conversations!');
    console.log('\nExample first command:');
    console.log('screeps_connect with connectionName="main", username="your-username", password="your-password"');
  } catch (error) {
    console.error('❌ Failed to write config:', error.message);
    console.log('\nManual setup:');
    console.log(`Add this to your Claude config at ${configPath}:`);
    console.log(JSON.stringify({
      mcpServers: {
        'screeps-api': {
          command: 'screeps-api-mcp'
        }
      }
    }, null, 2));
  }
}

setupClaude();