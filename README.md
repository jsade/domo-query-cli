<p align="center">
  <img src="docs/images/domo-inc.png" alt="Domo" />
</p>
<h1>
    <p align="center">Domo Query CLI</p>
</h1>

<div align="center" style="margin-bottom:10px">
A simple command-line interface for exploring your <a href="https://domo.com/" alt="Domo">Domo</a> data pipelines, datasets, and dataflows.
</div>

## Features

- 🔍 **Data Discovery** - Search and explore datasets, dataflows, and cards
- 🔗 **Data Lineage** - Trace data flow with focused Mermaid diagrams
- 📊 **Pipeline Monitoring** - Track dataflow execution and health scores
- 📝 **Report Generation** - Export documentation in Markdown/JSON formats
- 🚀 **Performance** - Built-in caching to minimize API calls
- 🎯 **Smart Autocomplete** - Interactive command discovery with tab completion

## Prerequisites

### For Development
1. **Node.js**: Version 18 or higher
2. **Yarn**: Version 4.x (via Corepack)
3. **Git**: For cloning the repository
4. **Domo Instance**: Access to a Domo instance (e.g., yourcompany.domo.com)
5. **Credentials**:
    - API Token
    - OAuth Client ID and Secret

## Development Setup

> [!CAUTION]
> **Pre-release, very early in development. Iterative changes to be expected.**
> Use only if you know what you're doing.

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/jsade/domo-query-cli.git
cd domo-query-cli

# Enable Corepack for Yarn 4
corepack enable

# Install dependencies
yarn install

# Copy environment variables template
cp .env.example .env
```

### Build from Source

```bash
# Build TypeScript
yarn build

# Run development mode (watch for changes)
yarn dev

# Run the CLI locally
yarn start
# or
yarn shell
```

### Create Standalone Executables (Optional)

```bash
# Build distributable executables for all platforms
yarn build:dist

# Executables will be in the dist/ directory
```

### Development Workflow

```bash
# Run tests
yarn test
yarn test:watch      # Watch mode
yarn test:coverage   # With coverage

# Code quality
yarn check           # Run all checks (format, lint, types)
yarn format          # Format code
yarn lint            # Lint code
yarn lint:fix        # Fix linting issues
yarn typecheck       # TypeScript type checking

# Generate API types from OpenAPI specs
yarn generate:types
```

## Configuration

Edit the `.env` file in the project root:

```bash
# Your Domo instance
DOMO_API_HOST=yourcompany.domo.com

# Authentication

# API Token
DOMO_API_TOKEN=your-api-token-here

# OAuth
DOMO_CLIENT_ID=your-client-id
DOMO_CLIENT_SECRET=your-client-secret

# Optional settings
DOMO_EXPORT_PATH=./exports
LOG_PATH=./logs
```

### Getting API Credentials

**API Token**:

1. Log into Domo → Admin → Security → Access Tokens
2. Create new token with appropriate permissions

**OAuth Credentials**:

1. Go to Admin → Security → Client Management
2. Create new client application
3. Copy Client ID and Secret

### Proxy Configuration

For corporate proxies, add to `.env`:

```bash
HTTPS_PROXY=http://proxy.company.com:8080
HTTP_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.internal.company.com

# For self-signed certificates (development only)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Quick Start

1. Start the CLI:

    ```bash
    yarn start
    # or
    yarn shell
    # or if built as executable
    ./dist/domo-query-cli
    ```

2. Type `help` to see available commands

3. Begin exploring your data!

## Command Reference

### Data Exploration Commands

| Command                             | Description                                                | Options/Details                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `list-datasets [options]`           | List all datasets with details (size, last updated, owner) | `--filter=<search>` - Filter by name<br>`--save-json` - Export to JSON<br>`--save-md` - Export to Markdown                                    |
| `list-dataflows [search] [options]` | List or search dataflows                                   | Supports fuzzy matching<br>Same export options as above                                                                                       |
| `list-cards [options]`              | List all accessible Domo cards                             | Same export options as above                                                                                                                  |
| `get-dataflow <id>`                 | Get detailed information about a specific dataflow         | Shows:<br>• Input/output datasets<br>• Transformation details<br>• Recent execution history                                                   |
| `show-lineage <id> [options]`       | Visualize data lineage for a dataset or dataflow           | `--diagram` - Generate focused Mermaid diagram<br>`--max-depth=<n>` - Limit diagram depth (default: 5)<br>`--save-md` - Export lineage report |

### Dataflow Operations

| Command                                             | Description                    | Details                                                                                                               |
| --------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `list-dataflow-executions <id>`                     | View execution history         | Shows:<br>• Status (success/failed/running)<br>• Duration and performance metrics<br>• Error messages for failed runs |
| `get-dataflow-execution <dataflowId> <executionId>` | Detailed execution information | Includes step-by-step progress                                                                                        |
| `execute-dataflow <id>`                             | Trigger a dataflow to run      | Requires API token                                                                                                    |

### Reporting Commands

| Command                             | Description                          | Options                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-lineage-report [options]` | Generate comprehensive documentation | `--type=<type>` - Report type:<br>&nbsp;&nbsp;• `full` - Complete lineage analysis<br>&nbsp;&nbsp;• `overview` - Health summary<br>&nbsp;&nbsp;• `orphans` - Unused datasets<br>`--include-diagrams` - Add Mermaid visualizations<br>`--save-path=<path>` - Custom output directory |
| `render-card <cardId> [options]`    | Export KPI card as image and data    | Saves both PNG visualization and JSON data                                                                                                                                                                                                                                          |

### System Commands

| Command        | Description                                   | Options                           |
| -------------- | --------------------------------------------- | --------------------------------- |
| `cache-status` | View or manage cache                          | `--clear` - Clear all cached data |
| `help`         | Show all available commands with descriptions |                                   |
| `clear`        | Clear terminal screen                         |                                   |
| `exit`         | Exit the application                          |                                   |

## Troubleshooting

### macOS Issues

**"Permission Denied"**

```bash
chmod +x domo-query-cli
```

**"Developer cannot be verified"**

- System Preferences → Security & Privacy → Allow Anyway
- Or run: `xattr -d com.apple.quarantine domo-query-cli`

### Connection Issues

1. Verify DOMO_API_HOST (no https://)
2. Check credentials are valid
3. For proxy: ensure HTTPS_PROXY is set
4. For SSL: set NODE_TLS_REJECT_UNAUTHORIZED=0 (dev only)

### API Token Issues

- Ensure token has necessary permissions
- API tokens required for dataflow operations
- Use OAuth for dataset/card operations

### General Tips

- Check logs in LOG_PATH directory
- Clear cache with `cache-status --clear`
- Use tab completion for commands and IDs

---

_Built with ❤️ for the Domo community_
