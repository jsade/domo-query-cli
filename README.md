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

### For Users (Pre-built Binary)
1. **Domo Instance**: Access to a Domo instance (e.g., yourcompany.domo.com)
2. **Credentials**:
    - API Token
    - OAuth Client ID and Secret

### For Development
1. **Node.js**: Version 18 or higher
2. **Yarn**: Version 4.x (via Corepack)
3. **Git**: For cloning the repository

## Installation

> [!CAUTION]
> **Pre-release, very early in development. Iterative changes to be expected.**
> Use only if you know what you're doing.

### Quick Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/jsade/domo-query-cli.git
cd domo-query-cli

# Run the installation script
./install.sh
```

The installation script will:
1. Install dependencies
2. Build a standalone executable
3. Install it to your system PATH
4. Set up configuration files

### Manual Installation

If you prefer to build from source:

```bash
# Clone the repository
git clone https://github.com/jsade/domo-query-cli.git
cd domo-query-cli

# Enable Corepack for Yarn 4
corepack enable

# Install dependencies
yarn install

# Build standalone executable
yarn build:dist

# The executable will be in release/domo-query-cli
# Copy it to a directory in your PATH
cp release/domo-query-cli /usr/local/bin/

# Copy environment variables template
cp .env.example ~/.domo-cli/.env
```

## Development Setup

### Build from Source

```bash
# Build TypeScript for development
yarn build

# Run development mode (watch for changes)
yarn dev

# Run the CLI locally without building
yarn start
# or
yarn shell
```

### Create Standalone Executables

```bash
# Build distributable executable for current platform
yarn build:dist

# Executable will be in release/domo-query-cli
# Archive will be in release/domo-query-cli-<platform>.zip
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
3. Required for: dataflow execution, dataset property updates

**OAuth Credentials**:

1. Go to Admin → Security → Client Management
2. Create new client application
3. Copy Client ID and Secret
4. Sufficient for: read operations, listing resources

**Note**: Some operations require specific authentication methods. API tokens provide broader permissions than OAuth for write operations.

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

1. **Start the interactive CLI:**

    ```bash
    # If installed via install.sh
    domo-query-cli
    
    # Or run directly from release directory
    ./release/domo-query-cli
    
    # Or for development
    yarn start
    ```

2. **Type `help` to see all available commands**

3. **Begin exploring your data!**

For non-interactive usage (scripts, automation, CI/CD), see [CLI.md](./CLI.md) for comprehensive documentation.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, tests, and release process.

## Command Reference

> 📚 **For comprehensive command documentation and non-interactive usage, see [CLI.md](./CLI.md)**

### Core Commands

| Command | Description |
| ------- | ----------- |
| `list-datasets [search]` | List all datasets with filtering and search |
| `get-dataset <id>` | Get detailed dataset information |
| `get-dataset-parents <id>` | Get immediate parents for a dataset (API-required); returns parent nodes keyed like `DATAFLOW24` |
| `get-dataset-children <id>` | Get immediate children for a dataset (API-required); returns child nodes keyed like `CARD123` |
| `update-dataset-properties <id>` | Update dataset name, description, tags (requires API token) |
| `list-dataflows [search]` | List or search dataflows |
| `get-dataflow <id>` | Get dataflow details and execution history |
| `execute-dataflow <id>` | Trigger a dataflow to run |
| `show-lineage <id>` | Visualize data lineage with Mermaid diagrams |
| `list-cards` | List all accessible Domo cards |
| `cache-status` | View or clear cache |
| `help` | Show all available commands |



## Common Examples

### Interactive Mode
```bash
# Start the interactive shell
domo-query-cli

# Inside the shell:
> list-datasets sales        # Search for sales datasets
> get-dataset abc-123-def    # Get specific dataset details
> execute-dataflow 12345     # Run a dataflow
> show-lineage abc-123 --diagram  # Visualize data lineage

### Get Dataset Parents (JSON)
```bash
domo-query-cli get-dataset-parents <dataset-id> --format json
```
Returns a JSON `parents` array of full nodes and a keyed map (`<TYPE><ID>`, e.g., `DATAFLOW24`) for O(1) lookup. Parent nodes include a `name` field when available (e.g., dataflow or dataset names).

### Get Dataset Children (JSON)
```bash
domo-query-cli get-dataset-children <dataset-id> --format json
```
Returns a JSON `children` array of full nodes and a keyed map (`<TYPE><ID>`, e.g., `CARD1213...`) for O(1) lookup. Child nodes include a `name` field when available (e.g., card title, dataset name, or dataflow name).
> help                       # See all commands
```

### Non-Interactive Mode (Scripts & Automation)
```bash
# List datasets with pagination
domo-query-cli list-datasets --limit 10 --offset 20

# Update dataset properties
domo-query-cli update-dataset-properties abc-123 \
  --name "Q4 Sales Data" \
  --tags "sales,q4,2024" \
  --no-confirm

# Execute dataflow with authentication
domo-query-cli --token YOUR_API_TOKEN execute-dataflow 12345

# Run in read-only mode (prevents destructive operations)
domo-query-cli --read-only list-dataflows

# Get JSON output for processing
domo-query-cli list-datasets --format json | jq '.data[]'
```

### Monitoring Dataflows
```bash
#!/bin/bash
# Monitor dataflow execution status

FLOW_ID="12345"
if domo-query-cli execute-dataflow "$FLOW_ID"; then
  echo "Dataflow started successfully"
  # Check execution status
  domo-query-cli list-dataflow-executions "$FLOW_ID" --limit 1
else
  echo "Failed to start dataflow"
  exit 1
fi
```

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
