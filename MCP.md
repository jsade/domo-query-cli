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
        "HTTPS_PROXY": "",
        "DOMO_DB_PATH": "/absolute/path/for/domo-db",
        "LOG_PATH": "/absolute/path/for/logs"
      }
    }
  }
}
```

**Note**: Replace `/path/to/your/domo-query-cli` with the actual path to your domo-query-cli directory, and add your Domo API credentials to the env section.

The MCP server reads these variables directly from its process environment, so anything you list under `env` is honored at runtime. Use the optional entries above to

- point `DOMO_DB_PATH` at a custom on-disk database/cache (default is `~/.domo-cli/db`), and
- set `LOG_PATH` to an absolute directory for MCP logs (packaged builds fall back to `~/.domo-cli/logs`).

Because the server loads `process.env` before consulting `.env` files, MCP-provided values take precedence over local configuration.

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

#### User Management Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list_users` | List all Domo users with optional search and role filtering | `search` (optional), `role` (optional: Admin/Privileged/Participant), `limit` (optional), `offset` (optional) |
| `get_user` | Get detailed user information including group memberships | `id` (required), `sync` (optional: force refresh from API) |

#### Group Management Tools
| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list_groups` | List all Domo groups with optional search and type filtering | `search` (optional), `type` (optional: open/user/system), `limit` (optional), `offset` (optional) |
| `get_group` | Get detailed group information including member list | `id` (required), `sync` (optional: force refresh from API) |

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
- `get_user` and `get_group` also support the `sync: true` parameter for forcing fresh data from the API
- For broader refreshes (datasets, dataflows, cards, users, groups), use `db_sync` before calling list tools, or use `clear_cache` to drop in-memory/file caches.

## User and Group Management

### list_users

List all Domo users with optional search and role filtering.

**Input Parameters:**
```json
{
  "search": "euler",           // Optional: filter by name or email
  "role": "Admin",            // Optional: Admin, Privileged, or Participant
  "limit": 100,               // Optional: max results (default: 50, max: 500)
  "offset": 0                 // Optional: pagination offset (default: 0)
}
```

**Example Usage in Claude Desktop:**
```
Can you list all Admin users?
Can you find users with "engineer" in their name or email?
Show me the first 100 users
```

**Response Format:**
```json
{
  "success": true,
  "command": "list-users",
  "data": {
    "users": [
      {
        "id": 871428330,
        "name": "John Euler",
        "email": "john.euler@company.com",
        "role": "Admin",
        "title": "Data Engineer",
        "groups": [...]
      }
    ]
  },
  "metadata": {
    "count": 1,
    "filter": {
      "search": "euler",
      "role": "Admin"
    }
  }
}
```

### get_user

Get detailed information about a specific user including group memberships, contact information, and metadata.

**Input Parameters:**
```json
{
  "id": "871428330",          // Required: user ID (as string)
  "sync": true                // Optional: force refresh from API
}
```

**Example Usage in Claude Desktop:**
```
Get details for user 871428330
Show me information about user ID 871428330 and refresh from the API
```

**Response Format:**
```json
{
  "success": true,
  "command": "get-user",
  "data": {
    "user": {
      "id": 871428330,
      "name": "John Euler",
      "email": "john.euler@company.com",
      "role": "Admin",
      "title": "Data Engineer",
      "phone": "+1-555-0123",
      "location": "San Francisco",
      "employeeNumber": "EMP-12345",
      "groups": [
        {
          "id": 1324037627,
          "groupId": 1324037627,
          "name": "Engineering"
        }
      ]
    }
  },
  "metadata": {
    "entityType": "user",
    "source": "database"
  }
}
```

### list_groups

List all Domo groups with optional search and type filtering.

**Input Parameters:**
```json
{
  "search": "engineering",    // Optional: filter by group name
  "type": "user",            // Optional: open, user, or system
  "limit": 50,               // Optional: max results (default: 50)
  "offset": 0                // Optional: pagination offset (default: 0)
}
```

**Example Usage in Claude Desktop:**
```
List all groups
Find groups with "engineering" in the name
Show me all open groups
```

**Response Format:**
```json
{
  "success": true,
  "command": "list-groups",
  "data": {
    "groups": [
      {
        "id": 1324037627,
        "groupId": 1324037627,
        "name": "Engineering",
        "groupType": "user",
        "memberCount": 15
      }
    ]
  },
  "metadata": {
    "count": 1,
    "filter": {
      "search": "engineering"
    }
  }
}
```

**Group Types:**
- `open` - Anyone can join
- `user` - Restricted membership, user-created
- `system` - System-managed groups

### get_group

Get detailed information about a specific group including full member list and metadata.

**Input Parameters:**
```json
{
  "id": "1324037627",         // Required: group ID (as string)
  "sync": true                // Optional: force refresh from API
}
```

**Example Usage in Claude Desktop:**
```
Get details for group 1324037627
Show me the members of group 1324037627
```

**Response Format:**
```json
{
  "success": true,
  "command": "get-group",
  "data": {
    "group": {
      "id": 1324037627,
      "groupId": 1324037627,
      "name": "Engineering",
      "groupType": "user",
      "memberCount": 15,
      "created": "2024-01-15T10:30:00Z",
      "groupMembers": [
        {
          "id": 871428330,
          "name": "John Euler",
          "displayName": "John Euler",
          "email": "john.euler@company.com"
        }
      ]
    }
  },
  "metadata": {
    "entityType": "group",
    "source": "database"
  }
}
```
