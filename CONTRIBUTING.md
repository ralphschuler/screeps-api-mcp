# Contributing to screeps-api-mcp

Thank you for your interest in contributing to screeps-api-mcp! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/screeps-api-mcp.git
   cd screeps-api-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Project Structure

```
src/
├── index.ts         # Main CLI entry point
├── screeps-api.ts   # Screeps API client implementation
├── tools.ts         # MCP tools implementation
└── types.ts         # TypeScript type definitions and Zod schemas

tests/
├── basic.test.js    # Basic functionality tests
├── tools.test.js    # Tools functionality tests
└── types.test.js    # Type validation tests

.github/workflows/   # GitHub Actions CI/CD
├── ci.yml          # Main CI pipeline
├── docker.yml      # Docker build and deployment
└── release.yml     # Release automation
```

### Available Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Build in watch mode
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode  
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Code Style

We use ESLint and Prettier to maintain code quality and consistency.

**Before committing:**
```bash
npm run format    # Format code
npm run lint:fix  # Fix linting issues
npm test         # Ensure tests pass
```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure code passes linting and formatting

3. **Test your changes**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new functionality"
   ```

   Use conventional commit format:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Maintenance tasks

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing Guidelines

### Writing Tests

- Place tests in the `tests/` directory
- Use descriptive test names
- Follow the existing test structure
- Test both success and error cases
- Mock external dependencies

### Test Structure

```javascript
import { describe, test } from 'node:test';
import assert from 'node:assert';

describe('Feature Name', () => {
  describe('method name', () => {
    test('should do something specific', () => {
      // Test implementation
      assert.strictEqual(actual, expected);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

## API Guidelines

### Adding New MCP Tools

1. **Define the tool in `src/tools.ts`**
   - Add tool definition to `getTools()` method
   - Include proper JSON schema for input validation
   - Add handler method for the tool

2. **Implement API methods in `src/screeps-api.ts`**
   - Follow existing patterns for error handling
   - Use proper TypeScript types
   - Handle authentication and rate limiting

3. **Add type definitions in `src/types.ts`**
   - Use Zod schemas for validation
   - Export TypeScript types
   - Document expected data structures

4. **Write comprehensive tests**
   - Test tool registration
   - Test input validation
   - Test error handling
   - Test API integration

### Error Handling

- Use descriptive error messages
- Handle network failures gracefully
- Provide meaningful feedback to users
- Log errors appropriately for debugging

### Type Safety

- Use TypeScript for all new code
- Prefer strict type checking
- Use Zod schemas for runtime validation
- Avoid `any` types when possible

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic
- Include usage examples
- Keep comments up to date

### README Updates

When adding new features:
- Update the feature list
- Add usage examples
- Update CLI options if applicable
- Update installation instructions if needed

## Release Process

Releases are automated through GitHub Actions:

1. **Version tags** trigger automated releases
2. **Main branch** pushes trigger development builds
3. **Pull requests** trigger CI validation

### Creating a Release

Maintainers can create releases by:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create and push a version tag:
   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

## Docker Development

### Building Docker Images

```bash
# Build development image
docker build -t screeps-api-mcp:dev .

# Test the image
docker run --rm screeps-api-mcp:dev --help
```

### Docker Best Practices

- Use multi-stage builds for smaller images
- Run as non-root user
- Include health checks
- Optimize layer caching

## Contributing Guidelines

### Pull Request Process

1. **Check existing issues** - Look for related issues or discussions
2. **Create an issue** - For new features, create an issue first to discuss
3. **Follow coding standards** - Use ESLint and Prettier
4. **Write tests** - Ensure good test coverage
5. **Update documentation** - Keep docs current
6. **Small, focused PRs** - Easier to review and merge

### Code Review

- All changes require review
- Address reviewer feedback promptly
- Keep discussions constructive
- Update PR based on feedback

### Issue Reporting

When reporting bugs:
- Use the issue template
- Include reproduction steps
- Provide environment details
- Include error messages/logs

### Feature Requests

When requesting features:
- Describe the use case
- Explain the expected behavior  
- Consider implementation complexity
- Discuss alternatives

## Community

### Communication

- GitHub Issues for bugs and features
- GitHub Discussions for general questions
- Pull Request comments for code-specific discussions

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and contribute
- Follow GitHub's community guidelines

## Getting Help

- Check existing documentation
- Search existing issues
- Create a new issue with details
- Join community discussions

Thank you for contributing to screeps-api-mcp! 🎮