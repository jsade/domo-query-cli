<p align="center">
  <img src="docs/images/domo-inc.png" alt="Domo" />
</p>
<h1>
    <p align="center">Domo Query CLI</p>
</h1>

<div align="center" style="margin-bottom:10px">
A simple command-line interface for exploring your <a href="https://domo.com/ alt="Domo">Domo</a> data pipelines, datasets, and dataflows.
</div>

## Features

- 🔍 **Data Discovery** - Search and explore datasets, dataflows, and cards
- 🔗 **Data Lineage** - Trace data flow with focused Mermaid diagrams
- 📊 **Pipeline Monitoring** - Track dataflow execution and health scores
- 📝 **Report Generation** - Export documentation in Markdown/JSON formats
- 🚀 **Performance** - Built-in caching to minimize API calls
- 🎯 **Smart Autocomplete** - Interactive command discovery with tab completion

## Prerequisites

1. **Operating System**: macOS, Windows, or Linux (64-bit)
2. **Domo Instance**: Access to a Domo instance (e.g., yourcompany.domo.com)
3. **Credentials**:
    - API Token
    - OAuth Client ID and Secret

## Installation

> [!CAUTION]
> **Pre-release, very early in development. Iterative changes to be expected.**
> Use only if you know what you're doing.
>

Download the latest release from the [releases page](https://github.com/jsade/domo-query-cli/releases) for your platform.

### macOS

1. Download and extract the zip file
2. Open Terminal and navigate to the extracted folder
3. Run the installation commands:

```bash
# Make the file executable
chmod +x domo-query-cli

# Remove quarantine attribute (prevents "unverified developer" warnings)
xattr -d com.apple.quarantine domo-query-cli

# Create app directory and install
mkdir -p ~/.domo-query-cli
mv domo-query-cli ~/.domo-query-cli/
cp .env.example ~/.domo-query-cli/.env

# Create a symlink in your PATH
sudo ln -s ~/.domo-query-cli/domo-query-cli /usr/local/bin/domo-query-cli

# Verify installation
domo-query-cli --version
```

### Windows & Linux

<details>
<summary>Click to view installation instructions</summary>

#### Windows

1. Download and extract the Windows zip file
2. Create folder `C:\tools\domo-query-cli`
3. Copy extracted files to this folder
4. Add folder to system PATH:
    - Press Win + X → System → Advanced system settings
    - Environment Variables → System variables → Path → Edit → New
    - Add `C:\tools\domo-query-cli`
5. Rename `.env.example` to `.env`
6. Verify: `domo-query-cli --version`

#### Linux

```bash
# Make executable and install
chmod +x domo-query-cli
mkdir -p ~/.domo-query-cli
mv domo-query-cli ~/.domo-query-cli/
cp .env.example ~/.domo-query-cli/.env
sudo ln -s ~/.domo-query-cli/domo-query-cli /usr/local/bin/domo-query-cli
domo-query-cli --version
```

</details>

## Configuration

Edit `~/.domo-query-cli/.env` (or installation directory on Windows):

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
    domo-query-cli
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
