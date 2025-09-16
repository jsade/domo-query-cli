# MCP Server Guide for Domo Query CLI

## Overview

This guide explains how to use Domo Query CLI as a local MCP server for any MCP client, such as Claude Desktop.

When you use the MCP server for Domo Query CLI, you can:

- Call your CLI commands as native tools
- Get responses directly without copy/paste
- Maintain context across multiple operations

## Setting Up the MCP Server

### 1. Build the MCP Server

```bash
# Build the MCP server
yarn mcp:build

# This creates mcp/dist/mcp-server.cjs
```

### 2. Test the MCP Server (optional)

```bash
# Run the MCP server to test it starts correctly
node mcp/dist/mcp-server.cjs

# It should start and wait for input (Ctrl+C to exit)
```

### 3. Add MCP Configuration to your MCP client

#### Example with Claude Desktop
Edit Claude Desktop's configuration file:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add your MCP server:
```json
{
  "mcpServers": {
    "domo-query-cli": {
      "command": "node",
      "args": ["/path/to/your/domo-query-cli/mcp/dist/mcp-server.cjs"],
      "env": {
        "DOMO_API_HOST": "your-instance.domo.com",
        "DOMO_API_TOKEN": "your-api-token",
        "DOMO_CLIENT_ID": "your-client-id",
        "DOMO_CLIENT_SECRET": "your-client-secret",
        "DOMO_DISABLE_SSL_VERIFICATION": "false",
        "HTTPS_PROXY": ""
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/domo-query-cli` with the actual path to your domo-query-cli directory, and add your Domo API credentials to the env section.

**Restart Claude Desktop** to load the MCP server.

## After MCP Setup

Once configured, your MCP client will have access to your Domo CLI tools directly. You can ask questions like:
- "What datasets do I have?"
- "Show me the lineage for dataset X"
- "Execute dataflow Y"

And Claude Desktop will be able to execute these commands directly through the MCP server.

### Available MCP Tools

The MCP server provides the following tools to Claude Desktop:

#### Data Listing Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list_datasets` | List all Domo datasets with metadata | `search` (optional), `limit` (optional), `offset` (optional) |
| `list_dataflows` | List all Domo dataflows with execution info | `search` (optional), `limit` (optional), `offset` (optional) |
| `list_cards` | List all Domo cards (visualizations) | `limit` (optional), `offset` (optional) |
| `list_pages` | List all Domo pages (dashboard collections) | `limit` (optional), `offset` (optional) |

#### Data Retrieval Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `get_dataset` | Get detailed dataset information | `id` (required), `sync` (optional) |
| `get_dataflow` | Get detailed dataflow information | `id` (required) |
| `get_card` | Get detailed card information | `id` (required) |
| `render_card` | Render a KPI card image and summary; auto-computes missing dimension from card aspect to avoid cropping | `cardId` (required), `width` (optional), `height` (optional), `scale` (optional) |

#### Lineage Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `show_lineage` | Show data lineage from local data | `datasetId` (required), `format` (optional: text/mermaid/json) |
| `get_dataset_lineage` | Get lineage from API (requires API token) | `datasetId` (required), `traverseUp` (optional), `traverseDown` (optional), `entities` (optional) |
| `get_dataset_parents` | Get direct parents for a dataset (requires API token). Returns a `parents` array and a keyed map (`<TYPE><ID>`) of full nodes, enriched with `name` when available. | `datasetId` (required) |
| `get_dataset_children` | Get direct children for a dataset (requires API token). Returns a `children` array and a keyed map (`<TYPE><ID>`) of full nodes, enriched with `name` when available. | `datasetId` (required) |
| `get_dataflow_lineage` | Get dataflow lineage from API | `dataflowId` (required), `traverseUp` (optional), `traverseDown` (optional), `entities` (optional) |
| `generate_lineage_report` | Generate comprehensive lineage report | `format` (optional: markdown/json) |

#### Dataflow Execution Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `execute_dataflow` | Execute a dataflow (write operation) | `id` (required) |
| `list_dataflow_executions` | List dataflow execution history | `dataflowId` (required), `limit` (optional), `offset` (optional) |
| `get_dataflow_execution` | Get specific execution details | `dataflowId` (required), `executionId` (required) |

#### Data Management Tools (Write Operations)
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `update_dataset_properties` | Update dataset properties (requires API token) | `id` (required), `name` (optional), `description` (optional), `tags` (optional) |

#### Cache Management Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `cache_status` | Show local cache status | None |
| `clear_cache` | Clear local cache | None |

#### Database Management Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `db_status` | Show local database status | None |
| `db_sync` | Sync database with Domo API | `datasets` (optional), `dataflows` (optional), `cards` (optional) |
| `db_clear` | Clear local database | `collections` (optional), `force` (optional) |
| `db_export` | Export database to JSON | `filename` (optional) |
| `db_import` | Import database from JSON | `filename` (required) |

**Note**: Some operations require specific authentication:
- Operations marked as "requires API token" need DOMO_API_TOKEN configuration
- Write operations respect read-only mode settings
- Lineage API calls require both API token and DOMO_API_HOST configuration

### Sync behavior
- `get_dataset` supports a `sync: true` parameter to force a fresh fetch from the Domo API and update the local database, bypassing any cached database entry. This mirrors the CLI flag `--sync` for `get-dataset`.
- For broader refreshes (datasets, dataflows, cards), use `db_sync` before calling list tools, or use `clear_cache` to drop in-memory/file caches.
