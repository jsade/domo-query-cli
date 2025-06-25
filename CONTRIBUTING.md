# Contributing to Domo Query CLI

Thank you for your interest in contributing to Domo Query CLI! This guide will help you get started with development, testing, and releasing.

## Table of Contents

- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style & Quality](#code-style--quality)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- Yarn 4.x (via Corepack)
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/domo-query-cli.git
   cd domo-query-cli
   ```

2. **Enable Corepack** (for Yarn 4)
   ```bash
   corepack enable
   ```

3. **Install dependencies**
   ```bash
   yarn install --immutable
   ```

4. **Set up environment** (for testing)
   ```bash
   cp .env.example .env
   # Edit .env with your Domo credentials
   ```

5. **Verify setup**
   ```bash
   yarn build
   yarn test
   yarn start  # Start the interactive shell
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Development Commands

```bash
# Run TypeScript compiler in watch mode
yarn dev

# Start the interactive shell for testing
yarn start
# or
yarn shell

# Build the project
yarn build

# Build platform executables
yarn build:dist

# Check what version will be released
yarn release:check

# Preview release with detailed debug info
yarn release:preview
```

### 3. Making Changes

#### Adding a New Command

1. Create a new file in `src/commands/`
2. Extend the `BaseCommand` class
3. Implement required methods: `name`, `description`, `usage`, `execute`
4. The command will be auto-registered when the shell starts

Example:
```typescript
import { BaseCommand } from '../core/commands/BaseCommand';

export class MyCommand extends BaseCommand {
    name = 'mycommand';
    description = 'Description of my command';
    usage = 'mycommand [options]';
    
    async execute(args: string[]): Promise<void> {
        // Implementation
    }
}
```

#### Working with API Clients

- Use existing clients in `src/api/clients/`
- All API calls should go through the client layer
- Handle errors appropriately with user-friendly messages

#### Project Structure

```
src/
├── api/           # API clients and utilities
├── commands/      # CLI commands
├── core/          # Core functionality (shell, auth)
├── managers/      # Business logic layer
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities
```

## Code Style & Quality

### Automated Formatting

The project uses Prettier for code formatting and ESLint for linting.

```bash
# Format code
yarn format

# Check formatting without changes
yarn format:check

# Run linter
yarn lint

# Fix linting issues
yarn lint:fix

# Run all checks (format + lint + typecheck)
yarn check
```

### Pre-commit Hooks

Husky automatically runs formatting and linting on staged files before commit.

### TypeScript

```bash
# Type checking
yarn typecheck

# Watch mode for type checking
yarn dev
```

### Code Conventions

1. **Use TypeScript** for all new code
2. **Follow existing patterns** - check similar files for conventions
3. **Error handling** - Provide clear, actionable error messages
4. **No console.log** - Use the logging system instead
5. **Async/await** - Prefer over callbacks or raw promises

## Testing

### Running Tests

```bash
# Run all tests once
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage

# Run a specific test file
yarn test src/commands/dataset.test.ts
```

### Writing Tests

Tests are written using Vitest and should be co-located with source files.

```typescript
// src/commands/mycommand.test.ts
import { describe, it, expect, vi } from 'vitest';
import { MyCommand } from './mycommand';

describe('MyCommand', () => {
    it('should execute successfully', async () => {
        const command = new MyCommand();
        // Mock dependencies
        vi.mock('../api/clients/DomoClient');
        
        // Test implementation
        await command.execute(['arg1']);
        
        // Assertions
        expect(result).toBe(expected);
    });
});
```

### Testing Guidelines

1. **Unit tests** - Test individual functions and classes
2. **Integration tests** - Test command execution with mocked API
3. **Mock external dependencies** - Use `vi.mock()` for API calls
4. **Test error cases** - Ensure proper error handling
5. **Focus on behavior** - Test what the code does, not how

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor (0.1.0 → 0.2.0) |
| `fix` | Bug fix | Patch (0.1.0 → 0.1.1) |
| `perf` | Performance improvement | Patch |
| `docs` | Documentation only | None |
| `style` | Code style (formatting) | None |
| `refactor` | Code refactoring | None |
| `test` | Test changes | None |
| `chore` | Maintenance tasks | None |
| `ci` | CI/CD changes | None |

### Breaking Changes

Add `!` after type or include `BREAKING CHANGE:` in footer:

```bash
feat!: remove deprecated API endpoints

# or

feat: new API structure

BREAKING CHANGE: The /api/v1/* endpoints have been removed
```

This triggers a major version bump (1.0.0 → 2.0.0)

### Using Commitizen

For interactive commit creation:

```bash
yarn commit
```

### Examples

```bash
# Feature
feat(dataflow): add support for bulk dataflow execution

# Bug fix
fix(auth): correct OAuth token refresh logic

# Breaking change
feat(api)!: change dataset response format

# Performance
perf(cache): optimize dataflow search caching

# Chore
chore(deps): update dependencies
```

## Pull Request Process

### Before Creating a PR

1. **Update from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks**
   ```bash
   yarn check
   yarn test
   yarn build
   ```

3. **Test manually**
   ```bash
   yarn start
   # Test your changes in the interactive shell
   ```

### Creating the PR

1. Push your branch to GitHub
2. Create a Pull Request with:
   - Clear title following commit conventions
   - Description of changes
   - Any breaking changes noted
   - Screenshots/examples if applicable

### PR Requirements

- All tests must pass
- No linting errors
- Code review approval required
- PR title must follow conventional commits format

## Release Process

Releases are fully automated using [semantic-release](https://semantic-release.gitbook.io/).

### Automatic Releases

1. **Triggered by**: Every push to `main` branch
2. **Version**: Determined by commit messages since last release
3. **Changelog**: Generated automatically from commits
4. **Assets**: Platform executables built and attached
5. **Git tags**: Created automatically

### What Happens During Release

1. Tests run and must pass
2. Project is built
3. Platform executables are created
4. Version is bumped based on commits
5. CHANGELOG.md is updated
6. Git commit and tag are created
7. GitHub Release is published with assets
8. Changes are pushed back to repository

### Checking Next Version

To preview what version will be released based on current commits:

```bash
yarn release:check
```

For more detailed output with debug information:

```bash
yarn release:preview
```

These commands will:
- Analyze commits since the last release tag
- Calculate the next version based on conventional commits
- Show what would be released without making any changes
- Work on any branch (not just main)

**Note**: These commands use a dummy GITHUB_TOKEN to bypass authentication requirements for local use. No actual release will be created.

Example output:
```
[semantic-release] › ℹ  Running semantic-release version 24.2.5
[semantic-release] › ✔  Loaded plugin "@semantic-release/commit-analyzer"
[semantic-release] › ✔  Loaded plugin "@semantic-release/release-notes-generator"
[semantic-release] › ℹ  Found 3 commits since last release
[semantic-release] › ℹ  Analyzing commit: feat(dataflow): add bulk execution support
[semantic-release] › ℹ  Analyzing commit: fix(cache): resolve memory leak
[semantic-release] › ℹ  The next release version is 1.1.0
```

### Version Bump Rules

The version bump follows semantic versioning based on commit types:

| Commit Type | Example | Version Change |
|-------------|---------|----------------|
| Breaking Change | `feat!:` or `BREAKING CHANGE:` | Major (1.0.0 → 2.0.0) |
| Feature | `feat:` | Minor (1.0.0 → 1.1.0) |
| Fix | `fix:` or `perf:` | Patch (1.0.0 → 1.0.1) |
| Other | `docs:`, `chore:`, etc. | No change |

### Manual Release (Testing)

For testing the release process:

1. Go to [GitHub Actions](https://github.com/your-repo/actions)
2. Select "Manual Release" workflow
3. Click "Run workflow"
4. Options:
   - **Dry run** (default): Shows what would be released
   - **Actual release**: Performs the release

### Version Control

Version bumps are automatic based on commit types:

- `fix:` → Patch release (1.0.0 → 1.0.1)
- `feat:` → Minor release (1.0.0 → 1.1.0)
- `feat!:` or `BREAKING CHANGE:` → Major release (1.0.0 → 2.0.0)

### Release Artifacts

Each release includes:

- `domo-query-cli-macos-arm64.zip` - macOS Apple Silicon
- `domo-query-cli-windows.zip` - Windows 64-bit
- `domo-query-cli-linux.zip` - Linux 64-bit

Each archive contains:
- `domo-query-cli` (or `domo-query-cli.exe` for Windows)
- `.env.example`
- `README.md`

## Getting Help

- Check existing issues on GitHub
- Review the [README](README.md) for usage
- Look at existing code for patterns
- Ask questions in GitHub Discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.