---
created: 2025-08-20 18:04:14
updated: 2025-08-24 21:23:00
title: Domo Query CLI - Non-Interactive Command Guide
---

# Domo Query CLI - Non-Interactive Command Guide

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Command Syntax Options](#command-syntax-options)
    - [Direct Command Syntax (Recommended)](#direct-command-syntax-recommended)
    - [Flag-Based Syntax](#flag-based-syntax)
    - [Multi-Word Commands](#multi-word-commands)
- [Automatic Non-Interactive Detection](#automatic-non-interactive-detection)
    - [Help and Documentation](#help-and-documentation)
- [Authentication](#authentication)
    - [Environment Variables](#environment-variables)
    - [Command Line Options](#command-line-options)
- [Common Commands](#common-commands)
    - [Dataset Operations](#dataset-operations)
    - [Dataflow Operations](#dataflow-operations)
    - [Card Operations](#card-operations)
    - [User Management](#user-management)
    - [Group Management](#group-management)
    - [Lineage and Reporting](#lineage-and-reporting)
    - [Database Operations](#database-operations)
- [Output Options](#output-options)
    - [Quick Reference](#quick-reference)
    - [Output Modes (Mutually Exclusive Display Formats)](#output-modes-mutually-exclusive-display-formats)
    - [Export Flags (File Output Options)](#export-flags-file-output-options)
    - [File Output (Custom Path)](#file-output-custom-path)
    - [Modifiers](#modifiers)
    - [Legacy Aliases (Deprecated)](#legacy-aliases-deprecated)
    - [Combining Flags Examples](#combining-flags-examples)
    - [Bug Fix: Format and Export Compatibility](#bug-fix-format-and-export-compatibility)
    - [Output Examples by Command Type](#output-examples-by-command-type)
    - [File-Based Output (Detailed)](#file-based-output-detailed)
- [Filtering and Pagination](#filtering-and-pagination)
- [Persistent Database](#persistent-database)
    - [Overview](#database-overview)
    - [Database Commands](#database-commands)
    - [Offline Mode](#offline-mode)
    - [Database Storage](#database-storage)
- [Advanced Usage](#advanced-usage)
    - [Piping and Redirection](#piping-and-redirection)
    - [Scripting Examples](#scripting-examples)
    - [Batch Operations](#batch-operations)
- [Error Handling](#error-handling)
- [Read-Only Mode](#read-only-mode)
    - [Enabling Read-Only Mode](#enabling-read-only-mode)
    - [Operations Blocked in Read-Only Mode](#operations-blocked-in-read-only-mode)
- [Configuration File](#configuration-file)
- [Tips and Best Practices](#tips-and-best-practices)
- [Examples](#examples)
    - [Dataflow Monitoring](#dataflow-monitoring)
    - [Execute Dataflow](#execute-dataflow)
    - [Execute Datasource](#execute-datasource-example)
    - [Get Dataflow Lineage](#get-dataflow-lineage)
    - [List Datasets with Pattern](#list-datasets-with-pattern)
    - [Get Card Details](#get-card-details)
    - [Update Dataset Properties](#update-dataset-properties)
- [Troubleshooting](#troubleshooting)
    - [Authentication Issues](#authentication-issues)
    - [Connection Issues](#connection-issues)
    - [Performance](#performance)

## Overview

The Domo Query CLI supports non-interactive command execution, allowing you to run commands directly from your terminal without entering the interactive shell. This is useful for scripting, automation, and quick one-off queries.

The CLI automatically detects when it's running in a non-interactive environment (like CI/CD pipelines, automation tools) and switches to non-interactive mode automatically.

## Basic Usage

```bash
# Run a single command (direct syntax)
domo-query-cli <command> [options]

# Run a single command (explicit flag syntax)
domo-query-cli --command "<command>" [options]

# With authentication
domo-query-cli --token YOUR_API_TOKEN <command> [options]

# Run in read-only mode (prevents destructive operations)
domo-query-cli --read-only <command> [options]
```

## Command Syntax Options

The CLI supports two ways to run commands non-interactively:

### Direct Command Syntax (Recommended)
```bash
# Simple format - just provide the command and arguments
domo-query-cli list-datasets --limit 10
domo-query-cli execute-dataflow 12345
```

### Flag-Based Syntax
```bash
# Using the --command flag (useful for complex commands)
domo-query-cli --command "list-datasets" --limit 10
domo-query-cli -c "execute-dataflow" 12345
```

### Multi-Word Commands
Both hyphenated and space-separated formats work:
```bash
# These are equivalent:
domo-query-cli list datasets --limit 10
domo-query-cli list-datasets --limit 10
```

## Automatic Non-Interactive Detection

The CLI automatically detects when it's running in a non-interactive environment and switches to command mode without requiring special flags. This happens when:

- Running from CI/CD pipelines (Jenkins, GitHub Actions, etc.)
- Called from automation tools (Claude Code, VS Code tasks, etc.)
- Executed through scripts where no TTY is available
- Any environment where `process.stdin.isTTY` is false

When non-interactive mode is detected:
- Commands are executed immediately and the process exits
- No shell prompt is displayed
- Output is streamlined for parsing by other tools
- Error messages are written to stderr for proper stream handling

This means you can use the CLI in automation without any special configuration:
```bash
# Works automatically in non-interactive environments
domo-query-cli list-datasets --limit 10
```

### Help and Documentation

```bash
# General help
domo-query-cli --help

# Version information
domo-query-cli --version
```

## Authentication

### Environment Variables
Set your credentials as environment variables to avoid passing them with each command:

```bash
export DOMO_API_TOKEN="your-api-token"
export DOMO_API_SECRET="your-api-secret"  # if using OAuth
export DOMO_INSTANCE="your-instance"      # e.g., "mycompany"
export DOMO_API_HOST="your-instance.domo.com"  # Required for v1/v3 API endpoints
export DOMO_READ_ONLY="true"              # Enable read-only mode globally (optional)
```

**Note:** Some operations require specific authentication methods:
- `update-dataset-properties` requires an API token (OAuth alone is not sufficient)
- `get-dataflow-lineage` requires an API token and DOMO_API_HOST configuration
- The API token must have appropriate permissions for the requested operations

### Command Line Options
```bash  
# Using API token
domo-query-cli --token YOUR_TOKEN list-datasets

# Using OAuth
domo-query-cli --client-id YOUR_ID --client-secret YOUR_SECRET list-datasets

# Specify instance
domo-query-cli --instance mycompany list-datasets
```

## Common Commands

### Dataset Operations

```bash
# List all datasets
domo-query-cli list-datasets

# List with filters
domo-query-cli list-datasets --limit 10
domo-query-cli list-datasets "sales"  # Search by name

# Get dataset details
domo-query-cli get-dataset 12345678-abcd-1234-5678-901234567890

# Get dataset details via v3 API (requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890 --format=json
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890 --export

# Get dataset lineage (requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-lineage 12345678-abcd-1234-5678-901234567890
domo-query-cli get-dataset-lineage 12345678-abcd-1234-5678-901234567890 --traverse-up=true --traverse-down=true
domo-query-cli get-dataset-lineage 12345678-abcd-1234-5678-901234567890 --entities=DATA_SOURCE,DATAFLOW

# Get dataset parents (shortcut; requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-parents 12345678-abcd-1234-5678-901234567890
domo-query-cli get-dataset-parents 12345678-abcd-1234-5678-901234567890 --format=json

# Get dataset children (shortcut; requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-children 12345678-abcd-1234-5678-901234567890
domo-query-cli get-dataset-children 12345678-abcd-1234-5678-901234567890 --format=json

# Update dataset properties (requires API token)
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --name "New Dataset Name"
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --description "Updated description" --tags "sales,2024,finance"
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --json '{"name":"New Name","tags":["tag1","tag2"]}'
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --json-file properties.json --no-confirm

# Execute datasource (trigger connector refresh, requires API token)
domo-query-cli execute-datasource 12345678-abcd-1234-5678-901234567890
domo-query-cli execute-datasource 12345678-abcd-1234-5678-901234567890 --wait
domo-query-cli execute-datasource id1 id2 id3  # Execute multiple datasources
```

#### execute-datasource

Trigger a manual refresh of connector-based datasets (e.g., Google Sheets, Salesforce, database connectors). This command uses the internal Domo Stream API to initiate execution.

**Authentication Required**: API Token (`DOMO_API_TOKEN` and `DOMO_API_HOST`)

**Interactive Usage:**
```bash
# Start the CLI shell
domo-query-cli

# Inside the shell:
> execute-datasource 12345678-abcd-1234-5678-901234567890
> execute-datasource abc-123 def-456 ghi-789  # Multiple datasets
> execute-datasource abc-123 --wait            # Wait for completion
```

**Non-Interactive Usage (Scripts/Automation):**
```bash
# Execute a single datasource
domo-query-cli execute-datasource 12345678-abcd-1234-5678-901234567890

# Execute multiple datasources in parallel
domo-query-cli execute-datasource abc-123 def-456 ghi-789

# Wait for execution to complete (blocking)
domo-query-cli execute-datasource abc-123 --wait

# Custom timeout and polling interval
domo-query-cli execute-datasource abc-123 --wait --timeout=300000 --interval=10000

# JSON output for automation
domo-query-cli execute-datasource abc-123 --format=json

# Example JSON output structure
{
  "success": true,
  "command": "execute-datasource",
  "data": {
    "executions": [
      {
        "datasetId": "12345678-abcd-1234-5678-901234567890",
        "success": true,
        "executionId": "1234",
        "state": "RUNNING",
        "startTime": 1736935800000,
        "endTime": null,
        "duration": null,
        "error": null,
        "errorCode": null
      }
    ]
  },
  "metadata": {
    "count": 1,
    "successCount": 1,
    "failCount": 0,
    "waited": false
  }
}
```

**Options:**
| Option | Description |
|--------|-------------|
| `--wait` | Wait for execution(s) to complete before returning |
| `--timeout=<ms>` | Maximum wait time in milliseconds (default: 600000 = 10 min) |
| `--interval=<ms>` | Polling interval in milliseconds (default: 5000) |
| `--format json` | Output results as JSON |

**Execution States:**
- `RUNNING` - Execution is currently running
- `SUCCESS` - Execution completed successfully
- `FAILED` - Execution failed (check error message)
- `CANCELLED` - Execution was cancelled
- `PENDING`, `QUEUED` - Execution is waiting to start

**Common Use Cases:**
- Refresh Google Sheets data on demand
- Trigger database connector updates before reports
- Automate data pipeline refreshes in CI/CD
- Batch refresh multiple connector datasets

**Important Notes:**
- Only works with connector-based datasets (not dataflows or API-uploaded datasets)
- Requires `DOMO_API_TOKEN` and `DOMO_API_HOST` environment variables
- Blocked in read-only mode (`DOMO_READ_ONLY=true`)
- Each dataset must have an associated stream (connector configuration)
- Multiple datasets execute in parallel; partial failures don't stop other executions

**See Also:**
- [execute-dataflow](#execute-dataflow) - Execute dataflows (ETL processes)
- [get-dataset](#get-dataset) - Get dataset details
- [get-dataset-v3](#get-dataset-v3) - Get dataset details via v3 API
- [list-datasets](#list-datasets) - List all datasets

#### get-dataset-v3

Get dataset information using the v3 API endpoint. Returns raw v3 response with extended metadata not available in the standard `get-dataset` command.

**Authentication Required**: API Token (`DOMO_API_TOKEN` and `DOMO_API_HOST`)

**Usage:**
```bash
# Get v3 dataset details
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890

# JSON output for automation
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890 --format=json

# Export to file
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890 --export
domo-query-cli get-dataset-v3 12345678-abcd-1234-5678-901234567890 --export=json
```

**V3-Specific Fields:**
| Field | Description |
|-------|-------------|
| `cloudId`, `cloudName`, `cloudEngine` | Connector/cloud configuration |
| `streamId`, `accountId` | Connector stream and account IDs |
| `scheduleActive`, `nextUpdate` | Schedule status and timing |
| `validConfiguration`, `validAccount` | Connector validation status |
| `cryoStatus` | Dataset archival status |
| `adc`, `adcExternal`, `adcSource` | ADC (Adrenaline Data Cache) info |
| `cardInfo` | Card count and view count |
| `formulas` | Beast Mode calculations defined on dataset |
| `transportType` | Data transport method |

**Example JSON Output:**
```json
{
  "success": true,
  "command": "get-dataset-v3",
  "data": {
    "dataset": {
      "id": "12345678-abcd-1234-5678-901234567890",
      "name": "Sales Data",
      "type": "domo-connector",
      "displayType": "domo-google-sheets",
      "dataProviderType": "google-spreadsheets",
      "status": "SUCCESS",
      "state": "SUCCESS",
      "rowCount": 50000,
      "columnCount": 25,
      "cloudId": "domo-google-sheets",
      "cloudName": "Google Sheets",
      "scheduleActive": true,
      "validConfiguration": true,
      "validAccount": true,
      "created": 1609459200000,
      "lastUpdated": 1736935800000
    }
  },
  "metadata": {
    "entityType": "dataset",
    "apiVersion": "v3"
  }
}
```

**Options:**
| Option | Description |
|--------|-------------|
| `--format json` | Output results as JSON |
| `--export` | Export to timestamped JSON file |
| `--export=json` | Export as JSON (explicit) |
| `--export=md` | Export as Markdown |
| `--export=both` | Export both JSON and Markdown |
| `--export-path=<dir>` | Custom export directory |

**When to Use:**
- Need connector/cloud configuration details
- Checking connector validation status
- Viewing Beast Mode formulas
- Getting schedule and execution timing info
- Accessing ADC status

**See Also:**
- [get-dataset](#get-dataset) - Standard dataset details with schema and PDP policies
- [execute-datasource](#execute-datasource) - Trigger connector refresh

### Dataflow Operations

```bash
# List dataflows
domo-query-cli list-dataflows

# Get dataflow details
domo-query-cli get-dataflow 987654321

# List dataflow executions
domo-query-cli list-dataflow-executions 987654321

# Get specific execution details
domo-query-cli get-dataflow-execution 987654321 execution-id

# Execute a dataflow
domo-query-cli execute-dataflow 987654321

# Get dataflow lineage from API (requires API token and DOMO_API_HOST)
domo-query-cli get-dataflow-lineage 987654321
domo-query-cli get-dataflow-lineage 987654321 --traverse-up=true --traverse-down=true
```

### Card Operations

```bash
# List cards
domo-query-cli list-cards

# Get card details
domo-query-cli get-card abc-123-def-456
domo-query-cli get card abc-123-def-456  # Alternative multi-word syntax

# List pages
domo-query-cli list-pages

# Render a KPI card
domo-query-cli render-card abc-123-def-456
```

### User Management

**Authentication Required**: OAuth or API Token

#### list-users

List all Domo users with optional search and role filtering.

**Interactive Usage:**
```bash
# Start the CLI shell
domo-query-cli

# Inside the shell:
> list-users                  # List all users (auto-paginate)
> list-users euler            # Search by name or email
> list-users --role Admin     # Filter by role
> list-users --limit 100      # Limit results
```

**Non-Interactive Usage (Scripts/Automation):**
```bash
# List all users
domo-query-cli list-users

# Search for users by name or email
domo-query-cli list-users "euler"

# Filter by role
domo-query-cli list-users --role Admin
domo-query-cli list-users --role Privileged
domo-query-cli list-users --role Participant

# Pagination
domo-query-cli list-users --limit 100
domo-query-cli list-users --limit 50 --offset 100

# JSON output for automation
domo-query-cli list-users --format json
domo-query-cli list-users "john" --role Admin --format json

# Example JSON output structure
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
        "groups": [
          {"id": 1324037627, "name": "Engineering", "groupId": 1324037627}
        ]
      }
    ]
  },
  "metadata": {
    "count": 1,
    "filter": {
      "search": "euler"
    }
  }
}
```

**Common Use Cases:**
- Find users by name or email for group management
- Audit user roles and permissions
- Export user lists for compliance reporting
- Identify users with specific roles (Admin, Privileged, Participant)

**See Also:**
- [get-user](#get-user) - Get detailed information about a specific user
- [list-groups](#list-groups) - List groups to see user memberships

#### get-user

Get detailed information about a specific user including group memberships, title, and contact information.

**Interactive Usage:**
```bash
# In the shell:
> get-user 871428330
> get-user 871428330 --offline    # Use cached data only
```

**Non-Interactive Usage (Scripts/Automation):**
```bash
# Get user details
domo-query-cli get-user 871428330

# JSON output for processing
domo-query-cli get-user 871428330 --format json

# Offline mode (use cached data only, no API calls)
domo-query-cli get-user 871428330 --offline

# Force sync from API (refresh cached data)
domo-query-cli get-user 871428330 --sync

# Example JSON output structure
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
        },
        {
          "id": 987654321,
          "groupId": 987654321,
          "name": "Administrators"
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

**Common Use Cases:**
- Verify user group memberships before granting access
- Look up user contact information
- Check user roles and permissions
- Build automated user audit reports

**Database Integration:**
- First fetch saves to local database
- Subsequent fetches use cached data (shows notice)
- Use `--sync` to force refresh from API
- Use `--offline` to work without network access

**See Also:**
- [list-users](#list-users) - Search and list all users
- [get-group](#get-group) - View group details and members

### Group Management

**Authentication Required**: OAuth or API Token

#### list-groups

List all Domo groups with optional search and type filtering.

**Interactive Usage:**
```bash
# Start the CLI shell
domo-query-cli

# Inside the shell:
> list-groups                     # List all groups
> list-groups engineering         # Search by name
> list-groups --type open         # Filter by type
> list-groups --limit 50          # Limit results
```

**Non-Interactive Usage (Scripts/Automation):**
```bash
# List all groups
domo-query-cli list-groups

# Search for groups by name
domo-query-cli list-groups "engineering"
domo-query-cli list-groups "admin"

# Filter by group type
domo-query-cli list-groups --type open
domo-query-cli list-groups --type user
domo-query-cli list-groups --type system

# Combine filters
domo-query-cli list-groups "eng" --type user

# JSON output for automation
domo-query-cli list-groups --format json
domo-query-cli list-groups "sales" --type open --format json

# Example JSON output structure
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
      },
      {
        "id": 987654321,
        "groupId": 987654321,
        "name": "Engineering Leadership",
        "groupType": "open",
        "memberCount": 5
      }
    ]
  },
  "metadata": {
    "count": 2,
    "filter": {
      "search": "engineering"
    }
  }
}
```

**Group Types:**
- `open` - Anyone can join these groups
- `user` - User-created groups with restricted membership
- `system` - System-managed groups

**Common Use Cases:**
- Find groups for access management
- Audit group membership and structure
- Identify groups by type for security reviews
- Export group lists for compliance reporting

**See Also:**
- [get-group](#get-group) - Get detailed information about a specific group
- [list-users](#list-users) - List users and their group memberships

#### get-group

Get detailed information about a specific group including full member list and group metadata.

**Interactive Usage:**
```bash
# In the shell:
> get-group 1324037627
> get-group 1324037627 --offline    # Use cached data only
```

**Non-Interactive Usage (Scripts/Automation):**
```bash
# Get group details with member list
domo-query-cli get-group 1324037627

# JSON output for processing
domo-query-cli get-group 1324037627 --format json

# Offline mode (use cached data only, no API calls)
domo-query-cli get-group 1324037627 --offline

# Force sync from API (refresh cached data)
domo-query-cli get-group 1324037627 --sync

# Example JSON output structure
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
        },
        {
          "id": 123456789,
          "name": "Jane Smith",
          "displayName": "Jane Smith",
          "email": "jane.smith@company.com"
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

**Common Use Cases:**
- View complete group membership lists
- Verify who has access through specific groups
- Export group member information for audits
- Check group metadata (creation date, type)

**Database Integration:**
- First fetch saves to local database
- Subsequent fetches use cached data (shows notice)
- Use `--sync` to force refresh from API
- Use `--offline` to work without network access

**See Also:**
- [list-groups](#list-groups) - Search and list all groups
- [get-user](#get-user) - View user details including group memberships

### Lineage and Reporting

```bash
# Show data lineage (builds lineage from local dataflow data)
domo-query-cli show-lineage dataset-id

# Get dataflow lineage from API (requires API token and DOMO_API_HOST)
domo-query-cli get-dataflow-lineage dataflow-id
domo-query-cli get-dataflow-lineage dataflow-id --traverse-up=true --traverse-down=true
domo-query-cli get-dataflow-lineage dataflow-id --entities=DATA_SOURCE,DATAFLOW,CARD

# Get dataset lineage from API (requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-lineage dataset-id
domo-query-cli get-dataset-lineage dataset-id --traverse-up=true --traverse-down=true
domo-query-cli get-dataset-lineage dataset-id --format=json --export

# Get dataset parents from API (requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-parents dataset-id
domo-query-cli get-dataset-parents dataset-id --format=json

# Get dataset children from API (requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-children dataset-id
domo-query-cli get-dataset-children dataset-id --format=json

### Get Dataset Parents

Get only the immediate parents for a dataset. This is a shortcut for quickly determining the parent dataflow(s) or upstream dataset(s) without inspecting the full lineage graph.

```bash
domo-query-cli get-dataset-parents <dataset-id> --format json
```

Output returns both (with `name` included when available):
- `parents`: an array of full parent node objects
- a map of parent nodes keyed as `<TYPE><ID>` (same as the lineage API), each value being the full node object

```json
{
  "success": true,
  "command": "get-dataset-parents",
  "data": {
    "parents": [
      {
        "type": "DATAFLOW",
        "id": "24",
        "name": "My ETL Flow",
        "descendantCounts": {},
        "ancestorCounts": { "DATAFLOW": 1, "DATA_SOURCE": 5 },
        "complete": true,
        "children": [
          {
            "type": "DATA_SOURCE",
            "id": "3f91f397-74fb-44ca-b836-95fb852d6e18",
            "complete": true,
            "children": [],
            "parents": []
          }
        ],
        "parents": [
          { "type": "DATA_SOURCE", "id": "cd5a6e39-be1e-40ca-922c-745b86e11ac7", "complete": true, "children": [], "parents": [] },
          { "type": "DATA_SOURCE", "id": "14765e40-2993-4d09-a444-6257a980f02d", "complete": true, "children": [], "parents": [] }
        ]
      }
    ],
    "DATAFLOW24": {
      "type": "DATAFLOW",
      "id": "24",
      "name": "My ETL Flow",
      "descendantCounts": {},
      "ancestorCounts": {
        "DATAFLOW": 1,
        "DATA_SOURCE": 5
      },
      "complete": true,
      "children": [
        {
          "type": "DATA_SOURCE",
          "id": "3f91f397-74fb-44ca-b836-95fb852d6e18",
          "complete": true,
          "children": [],
          "parents": []
        }
      ],
      "parents": [
        {
          "type": "DATA_SOURCE",
          "id": "cd5a6e39-be1e-40ca-922c-745b86e11ac7",
          "complete": true,
          "children": [],
          "parents": []
        },
        {
          "type": "DATA_SOURCE",
          "id": "14765e40-2993-4d09-a444-6257a980f02d",
          "complete": true,
          "children": [],
          "parents": []
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2025-09-16T13:41:10.500Z",
    "datasetId": "3f91f397-74fb-44ca-b836-95fb852d6e18",
    "entityType": "dataset",
    "note": "Parents extracted from Domo API v1/lineage endpoint"
  }
}
```

### Get Dataset Children

Get only the immediate children for a dataset. Useful for quickly finding direct dataset outputs and cards downstream from a dataset.

```bash
domo-query-cli get-dataset-children <dataset-id> --format json
```

Output returns both (with `name` included when available):
- `children`: an array of full child node objects
- a map of child nodes keyed as `<TYPE><ID>` with each value being the full node object from the lineage response when available

```json
{
  "success": true,
  "command": "get-dataset-children",
  "data": {
    "children": [
      {
        "type": "CARD",
        "id": "1213681340",
        "name": "Sales Overview",
        "descendantCounts": {},
        "ancestorCounts": {},
        "complete": true,
        "children": [],
        "parents": [
          { "type": "DATA_SOURCE", "id": "3f91f397-74fb-44ca-b836-95fb852d6e18", "complete": true, "children": [], "parents": [] }
        ]
      },
      {
        "type": "DATA_SOURCE",
        "id": "a03d933e-8abf-4d11-9099-cd9d3bc45e48",
        "descendantCounts": {},
        "ancestorCounts": {},
        "complete": true,
        "children": [],
        "parents": [
          { "type": "DATA_SOURCE", "id": "3f91f397-74fb-44ca-b836-95fb852d6e18", "complete": true, "children": [], "parents": [] }
        ]
      }
    ],
    "CARD1213681340": {
      "type": "CARD",
      "id": "1213681340",
      "name": "Sales Overview",
      "descendantCounts": {},
      "ancestorCounts": {},
      "complete": true,
      "children": [],
      "parents": [
        {
          "type": "DATA_SOURCE",
          "id": "3f91f397-74fb-44ca-b836-95fb852d6e18",
          "complete": true,
          "children": [],
          "parents": []
        }
      ]
    },
    "DATA_SOURCEa03d933e-8abf-4d11-9099-cd9d3bc45e48": {
      "type": "DATA_SOURCE",
      "id": "a03d933e-8abf-4d11-9099-cd9d3bc45e48",
      "name": "Transformed Sales Dataset",
      "descendantCounts": {},
      "ancestorCounts": {},
      "complete": true,
      "children": [],
      "parents": [
        {
          "type": "DATA_SOURCE",
          "id": "3f91f397-74fb-44ca-b836-95fb852d6e18",
          "complete": true,
          "children": [],
          "parents": []
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2025-09-16T13:41:10.500Z",
    "datasetId": "3f91f397-74fb-44ca-b836-95fb852d6e18",
    "entityType": "dataset",
    "note": "Children extracted from Domo API v1/lineage endpoint"
  }
}
```

# Generate lineage report
domo-query-cli generate-lineage-report dataset-id

# Check cache status
domo-query-cli cache-status
```

### Database Operations

```bash
# Check database status
domo-query-cli db-status
domo-query-cli db-status --format=json

# Sync database with Domo API
domo-query-cli db-sync                    # Sync all entities
domo-query-cli db-sync --datasets         # Sync only datasets
domo-query-cli db-sync --dataflows        # Sync only dataflows
domo-query-cli db-sync --cards            # Sync only cards
domo-query-cli db-sync --users            # Sync only users
domo-query-cli db-sync --groups           # Sync only groups
domo-query-cli db-sync --all              # Explicitly sync all

# Clear database
domo-query-cli db-clear                   # Clear all (with confirmation)
domo-query-cli db-clear --force           # Clear all without confirmation
domo-query-cli db-clear datasets          # Clear specific collection
domo-query-cli db-clear dataflows cards   # Clear multiple collections
domo-query-cli db-clear users             # Clear users collection
domo-query-cli db-clear groups            # Clear groups collection
domo-query-cli db-clear users groups      # Clear both users and groups

# Export database
domo-query-cli db-export                  # Export to timestamped file
domo-query-cli db-export backup.json      # Export to specific file
domo-query-cli db-export --format=json    # Export with JSON output

# Import database
domo-query-cli db-import backup.json      # Import from file
domo-query-cli db-import /path/to/export.json

# Use database with existing commands
domo-query-cli get-dataset 123456         # Uses cache if available
domo-query-cli get-dataset 123456 --sync  # Force refresh from API
domo-query-cli get-dataset 123456 --offline # Only use local database
```

## Output Options

The CLI provides a unified output system that supports multiple display modes, export formats, and file output options. These flags can be combined to control how data is displayed and saved.

### Quick Reference

```bash
# OUTPUT FORMAT (mutually exclusive display modes):
--format=table       # Default human-readable output (implied)
--format=json        # Structured JSON to stdout

# EXPORT FLAGS (can combine with any output mode):
--export             # Export data to timestamped file (JSON)
--export=json        # Export as JSON (explicit)
--export=md          # Export as Markdown
--export=both        # Export as both JSON and Markdown
--export-path=<dir>  # Custom export directory

# FILE OUTPUT (alternative to export):
--output=<path>      # Write JSON to specific file path

# MODIFIERS:
--quiet, -q          # Suppress informational messages

# LEGACY ALIASES (deprecated but supported):
--save       → --export
--save-json  → --export=json
--save-md    → --export=md
--save-both  → --export=both
--path=<dir> → --export-path=<dir>
```

### Output Modes (Mutually Exclusive Display Formats)

Commands support two primary output modes for displaying results:

```bash
# Table format (default) - Human-readable terminal output
domo-query-cli list-datasets

# JSON format - Structured data to stdout
domo-query-cli list-datasets --format=json
```

**Standard JSON Response Format:**
All JSON output follows a consistent structure for easy parsing:

```json
{
  "success": true,
  "command": "command-name",
  "data": {
    "...": "command-specific data"
  },
  "metadata": {
    "timestamp": "2025-12-08T10:30:00.000Z",
    "count": 42
  }
}
```

### Export Flags (File Output Options)

Export flags allow you to save command results to files. These work **with both** table and JSON output modes:

```bash
# Export to timestamped JSON file (e.g., list-datasets_20251208_103000.json)
domo-query-cli list-datasets --export

# Export as JSON (explicit format)
domo-query-cli list-datasets --export=json

# Export as Markdown documentation
domo-query-cli list-datasets --export=md

# Export as both JSON and Markdown
domo-query-cli list-datasets --export=both

# Custom export directory
domo-query-cli list-datasets --export --export-path=/tmp/reports
domo-query-cli list-datasets --export=md --export-path=./documentation
```

**Important Behavior:**
- Export flags work **independently** of `--format` flag
- You can use `--format=json` for stdout AND `--export` for file output simultaneously
- Default export format is JSON with automatic timestamped filenames
- Files are saved to `~/.domo-cli/exports/` by default (or custom path via `--export-path`)

### File Output (Custom Path)

For precise control over output file location and name:

```bash
# Write JSON to specific file path
domo-query-cli list-datasets --output=/tmp/datasets.json

# Relative paths work too
domo-query-cli get-dataset abc-123 --output=./exports/dataset.json

# Parent directories are created automatically
domo-query-cli get-dataset abc-123 --output=/tmp/domo/exports/2024/dataset.json
```

**Precedence:**
- `--output=<path>` takes precedence over `--export*` flags
- When using `--output`, export flags are ignored

### Modifiers

```bash
# Suppress informational messages (only show essential output)
domo-query-cli list-datasets --quiet

# Suppress export confirmation messages
domo-query-cli list-datasets --export --quiet
```

### Legacy Aliases (Deprecated)

For backward compatibility, the following legacy flags are still supported but deprecated:

| Legacy Flag | Modern Equivalent |
|-------------|------------------|
| `--save` | `--export` |
| `--save-json` | `--export=json` |
| `--save-md` | `--export=md` |
| `--save-both` | `--export=both` |
| `--path=<dir>` | `--export-path=<dir>` |

**Deprecation Notice:** While these legacy flags continue to work, new scripts should use the `--export*` flags for consistency with the unified output system.

### Combining Flags Examples

The unified output system allows flexible combinations:

```bash
# Display JSON to console AND export to timestamped file
domo-query-cli list-datasets --format=json --export

# Table display to console, export as Markdown
domo-query-cli list-datasets --export=md

# JSON to console, export both JSON and Markdown
domo-query-cli list-datasets --format=json --export=both

# JSON to console, export to custom location
domo-query-cli list-datasets --format=json --export --export-path=/tmp/reports

# Write directly to specific file (no console output of data)
domo-query-cli list-datasets --output=/tmp/datasets.json

# Quiet mode - suppress confirmations, only show data
domo-query-cli list-datasets --format=json --export --quiet
```

### Bug Fix: Format and Export Compatibility

**Previous Behavior (Bug):**
- Using `--format=json` would silently ignore `--save*` flags
- Users couldn't get JSON console output AND file export simultaneously

**Current Behavior (Fixed):**
- `--format=json` and `--export*` flags work together
- Console output and file exports are independent
- All flag combinations are now supported

### Output Examples by Command Type

**Dataset Operations:**
```bash
# List with export
domo-query-cli list-datasets --export=md --export-path=./docs

# Get details with JSON output and file export
domo-query-cli get-dataset abc-123 --format=json --export

# Lineage with custom output file
domo-query-cli get-dataset-lineage abc-123 --output=/tmp/lineage.json
```

**Dataflow Operations:**
```bash
# Execute with JSON status and export
domo-query-cli execute-dataflow 12345 --format=json --export

# List executions with both formats exported
domo-query-cli list-dataflow-executions 12345 --export=both
```

**User & Group Management:**
```bash
# List users with JSON export
domo-query-cli list-users --format=json --export

# Get group details as Markdown
domo-query-cli get-group 123456 --export=md
```

### File-Based Output (Detailed)

All read-only commands support the `--output` flag to write JSON results to a local file instead of returning them to stdout. This is especially useful for:
- Processing large datasets without terminal output limitations
- Building batch processing workflows
- Persisting results for later analysis
- Reducing context usage when working with multiple objects

**Basic Usage:**
```bash
# Write output to a file
domo-query-cli list-datasets --limit 100 --output /tmp/datasets.json

# The command returns file metadata instead of full data
# Output: "Output written to: /tmp/datasets.json (52480 bytes)"
```

**Path Handling:**
```bash
# Absolute paths
domo-query-cli get-dataset abc-123 --output /tmp/dataset.json

# Relative paths (relative to current directory)
domo-query-cli get-dataset abc-123 --output ./exports/dataset.json

# Automatic directory creation (parent directories are created if needed)
domo-query-cli get-dataset abc-123 --output /tmp/domo/exports/2024/dataset.json
```

**Combining with Other Flags:**
```bash
# File output works seamlessly with all other parameters
domo-query-cli list-datasets "sales" --limit 50 --format json --output /tmp/sales.json

# Force sync to API and save to file
domo-query-cli get-dataset abc-123 --sync --output /tmp/dataset_fresh.json

# Get lineage and save to file
domo-query-cli get-dataset-lineage abc-123 --traverse-up=true --traverse-down=true --output /tmp/lineage.json
```

**Processing Saved Output:**
```bash
# Save multiple datasets to files
for id in abc-123 def-456 ghi-789; do
  domo-query-cli get-dataset "$id" --output "/tmp/dataset_${id}.json"
done

# Process saved files with jq
for file in /tmp/dataset_*.json; do
  jq '.data.dataset | {name, rows, columns}' "$file"
done

# Combine saved results
jq -s '.' /tmp/dataset_*.json > /tmp/all_datasets.json
```

**Supported Commands:**
The `--output` flag is available on all read-only commands including:
- `list-datasets`, `list-dataflows`, `list-cards`, `list-pages`
- `get-dataset`, `get-dataflow`, `get-card`
- `show-lineage`, `get-dataset-lineage`, `get-dataset-parents`, `get-dataset-children`, `get-dataflow-lineage`
- `generate-lineage-report`
- `list-dataflow-executions`, `get-dataflow-execution`
- `render-card` (saves metadata only, not the image)
- `cache-status`, `db-status`
- `list-users`, `get-user`, `list-groups`, `get-group`

## Filtering and Pagination

```bash
# Limit results
domo-query-cli list-datasets --limit 10

# Offset for pagination
domo-query-cli list-datasets --limit 20 --offset 40

# Search by name
domo-query-cli list-datasets "sales"

# Sort results
domo-query-cli list-datasets --sort name
```

## Persistent Database

### Database Overview

The Domo Query CLI includes a built-in persistent JSON database that stores fetched data locally for improved performance and offline access. This feature provides:

- **Fast local lookups**: Dramatically faster repeated queries
- **Offline capability**: Work without network access for read operations
- **Reduced API calls**: Minimize rate limiting issues
- **Data persistence**: All data survives shell restarts
- **Automatic backups**: Before destructive operations

### Database Commands

The CLI provides several commands for managing the local database:

#### db-status
Display database statistics and information about stored collections.

```bash
domo-query-cli db-status
domo-query-cli db-status --format=json
```

Shows:
- Database version and metadata
- Collection statistics (entities count, size)
- Last sync timestamps
- Total database size

#### db-sync
Synchronize the local database with the Domo API.

```bash
# Sync all entity types
domo-query-cli db-sync
domo-query-cli db-sync --all

# Sync specific entity types
domo-query-cli db-sync --datasets
domo-query-cli db-sync --dataflows
domo-query-cli db-sync --cards
domo-query-cli db-sync --users
domo-query-cli db-sync --groups

# Combine multiple types
domo-query-cli db-sync --datasets --cards
domo-query-cli db-sync --users --groups

# JSON output
domo-query-cli db-sync --all --format=json
```

Notes:
- Full-detail sync by default:
  - Datasets: Fetches v1 details and v3 `includeAllDetails=true` when available; stores merged record.
  - Dataflows: Fetches detailed v2 plus v1 (actions, gui, triggers) when available; stores a normalized entity.
  - Cards: Attempts detailed content API fetch; falls back to list-level fields if detail is unavailable.
- Concurrency: detail fetches run with a bounded concurrency (default 5). Adjust via `DOMO_SYNC_CONCURRENCY=<number>`.
- Graceful degradation: If an enrichment call fails (e.g., missing token for card detail), the sync stores the best available data and continues.

#### db-clear
Clear database contents with safety confirmations.

```bash
# Clear all collections (prompts for confirmation)
domo-query-cli db-clear

# Clear without confirmation
domo-query-cli db-clear --force

# Clear specific collections
domo-query-cli db-clear datasets
domo-query-cli db-clear dataflows cards
domo-query-cli db-clear users
domo-query-cli db-clear groups
domo-query-cli db-clear users groups

# JSON output
domo-query-cli db-clear --all --force --format=json
```

#### db-export
Export the entire database to a JSON file for backup or sharing.

```bash
# Export with automatic timestamp
domo-query-cli db-export

# Export to specific file
domo-query-cli db-export my-backup.json
domo-query-cli db-export /path/to/backup.json

# JSON output format
domo-query-cli db-export backup.json --format=json
```

#### db-import
Import a database from a previously exported JSON file.

```bash
# Import from file
domo-query-cli db-import backup.json
domo-query-cli db-import /path/to/export.json

# JSON output format
domo-query-cli db-import data.json --format=json
```

Note: Import merges with existing data. Use `db-clear` first to replace all data.

### Offline Mode

Commands that support database integration can work in offline mode using only local data:

```bash
# Get dataset from local database only
domo-query-cli get-dataset 123456 --offline

# This will fail if the dataset is not in the local database
# Use db-sync first to populate the database
```

### Database Storage

The database is stored in your home directory by default:

- **Default location**: `~/.domo-cli/db/`
- **Custom location**: Set `DOMO_DB_PATH` environment variable
- **Structure**:
  - `datasets.json` - Dataset entities
  - `dataflows.json` - Dataflow entities
  - `cards.json` - Card entities
  - `metadata.json` - Database version and sync times
  - `backups/` - Automatic backups before modifications

Each instance (domain) gets its own subdirectory for multi-instance support.

### Integration with Existing Commands

Many commands automatically use the database for improved performance:

```bash
# First fetch saves to database
domo-query-cli get-dataset 123456

# Subsequent fetches use cached data (if recent)
domo-query-cli get-dataset 123456  # Uses cache, shows notice

# Force refresh from API
domo-query-cli get-dataset 123456 --sync

# Use only local database
domo-query-cli get-dataset 123456 --offline
```

### Best Practices

1. **Initial Setup**: Run `db-sync` to populate the database with your Domo data
2. **Regular Syncs**: Schedule periodic `db-sync` commands to keep data fresh
3. **Backup Important Data**: Use `db-export` before major operations
4. **Offline Work**: Use `--offline` flag when working without network access
5. **Performance**: Use local database for repeated queries and analysis

## Advanced Usage

### Piping and Redirection

```bash
# Redirect to file
domo-query-cli list-datasets > datasets.txt

# Process with grep
domo-query-cli list-datasets | grep "sales"
```

### Scripting Examples

```bash
#!/bin/bash
# List and process datasets

domo-query-cli list-datasets --limit 100 | while read -r line; do
  echo "Processing: $line"
  # Add your processing logic here
done
```

### Batch Operations

```bash
# Execute multiple dataflows
for flow_id in 123 456 789; do
  domo-query-cli execute-dataflow $flow_id
done

# Get details for multiple dataflows
for flow_id in 123 456 789; do
  domo-query-cli get-dataflow $flow_id
done
```

## Error Handling

The CLI returns standard exit codes:
- `0`: Success
- `1`: General error
- `2`: Authentication error
- `3`: Not found error
- `4`: Permission error

```bash
# Check if command succeeded
if domo-query-cli execute-dataflow 123; then
  echo "Dataflow executed successfully"
else
  echo "Dataflow execution failed with code $?"
fi
```

## Read-Only Mode

The CLI supports a read-only mode that prevents any destructive operations from being executed. This is useful for:
- Safe exploration of data in production environments
- Training and demonstrations
- Automated scripts that should only read data

### Enabling Read-Only Mode

There are two ways to enable read-only mode:

1. **Environment Variable** (applies globally):
   ```bash
   export DOMO_READ_ONLY=true
   domo-query-cli list-dataflows  # Safe - read operation
   domo-query-cli execute-dataflow 123  # Blocked - destructive operation
   ```

2. **Command Line Flag** (per session):
   ```bash
   domo-query-cli --read-only list-datasets  # Safe
   domo-query-cli --read-only execute-dataflow 123  # Blocked
   ```

### Operations Blocked in Read-Only Mode

The following operations are disabled when read-only mode is active:
- `execute-dataflow` - Executing dataflows
- `execute-datasource` - Executing connector-based datasources
- `createDataflow` - Creating new dataflows
- `updateDataflow` - Updating existing dataflows
- `patchDataflow` - Patching dataflow configurations
- `deleteDataflow` - Deleting dataflows
- `update-dataset-properties` - Updating dataset properties (name, description, tags)

All read operations (list, get, show, etc.) remain available.

## Configuration File

Create a `.domo-query.json` file in your home directory or project root:

```json
{
  "instance": "mycompany",
  "defaultFormat": "json",
  "apiToken": "your-token-here",
  "proxy": {
    "host": "proxy.company.com",
    "port": 8080
  }
}
```

## Tips and Best Practices

1. **Use environment variables** for credentials to keep them secure
2. **Set default output format** in configuration file to avoid repetition
3. **Use `--dry-run` flag** to preview commands without execution
4. **Leverage JSON output with jq** for complex data processing
5. **Create shell aliases** for frequently used commands:
   ```bash
   alias domo-datasets='domo-query-cli list-datasets'
   alias domo-exec='domo-query-cli execute-dataflow'
   ```

6. **Use verbose output** for debugging when needed

## Examples

### Dataflow Monitoring
```bash
#!/bin/bash
# Monitor dataflow executions

FLOW_ID="12345"
domo-query-cli list-dataflow-executions "$FLOW_ID" --limit 5
```

### Execute Dataflow
```bash
#!/bin/bash
# Execute a dataflow

FLOW_ID=$1
if domo-query-cli execute-dataflow "$FLOW_ID"; then
  echo "Dataflow execution started successfully"
  # Check execution status
  domo-query-cli list-dataflow-executions "$FLOW_ID" --limit 1
else
  echo "Failed to start dataflow execution"
  exit 1
fi
```

### Execute Datasource {#execute-datasource-example}
```bash
#!/bin/bash
# Trigger refresh of connector-based datasets (Google Sheets, etc.)

# Execute a single datasource
DATASET_ID="12345678-abcd-1234-5678-901234567890"
domo-query-cli execute-datasource "$DATASET_ID"

# Execute and wait for completion
if domo-query-cli execute-datasource "$DATASET_ID" --wait; then
  echo "Datasource refresh completed successfully"
else
  echo "Datasource refresh failed"
  exit 1
fi

# Execute multiple datasources in parallel
DATASETS=(
  "abc-123-def-456"
  "def-456-ghi-789"
  "ghi-789-jkl-012"
)

echo "Triggering refresh for ${#DATASETS[@]} datasources..."
domo-query-cli execute-datasource "${DATASETS[@]}" --wait --format=json

# Automated refresh with error handling
for dataset_id in "${DATASETS[@]}"; do
  echo "Refreshing: $dataset_id"
  if domo-query-cli execute-datasource "$dataset_id" --wait --timeout=300000; then
    echo "  ✓ Success"
  else
    echo "  ✗ Failed"
  fi
done
```

### Get Dataflow Lineage
```bash
#!/bin/bash
# Get complete lineage for a dataflow

FLOW_ID=$1
# Requires API token and DOMO_API_HOST
export DOMO_API_HOST="mycompany.domo.com"

# Get complete lineage traversing both directions
domo-query-cli get-dataflow-lineage "$FLOW_ID" \
  --traverse-up=true \
  --traverse-down=true \
  --format=json > "lineage_${FLOW_ID}.json"

echo "Lineage saved to lineage_${FLOW_ID}.json"
```

### List Datasets with Pattern
```bash
#!/bin/bash
# List datasets matching a pattern

domo-query-cli list-datasets "sales" --limit 50 | while read -r line; do
  echo "Found dataset: $line"
done
```

### Get Dataset Lineage
```bash
#!/bin/bash
# Get dataset lineage information (requires API token and DOMO_API_HOST)

DATASET_ID="12345678-abcd-1234-5678-901234567890"

# Get basic lineage
domo-query-cli get-dataset-lineage "$DATASET_ID"

# Get complete lineage (both upstream and downstream)
domo-query-cli get-dataset-lineage "$DATASET_ID" \
  --traverse-up=true \
  --traverse-down=true

# Get lineage and save to JSON
domo-query-cli get-dataset-lineage "$DATASET_ID" \
  --traverse-up=true \
  --traverse-down=true \
  --format=json > "dataset_lineage_${DATASET_ID}.json"

# Filter by specific entity types
domo-query-cli get-dataset-lineage "$DATASET_ID" \
  --entities=DATA_SOURCE,DATAFLOW \
  --traverse-up=true

echo "Dataset lineage retrieved for ID: $DATASET_ID"
```

### Get Card Details
```bash
#!/bin/bash
# Get detailed information about a card

CARD_ID="abc-123-def-456"

# Get card details in formatted output
domo-query-cli get-card "$CARD_ID"

# Get card details as JSON for processing
domo-query-cli get-card "$CARD_ID" --format json | jq '.data.card'

# Export card details to markdown documentation
domo-query-cli get-card "$CARD_ID" --export=md --export-path ./docs

# Export to both JSON and Markdown formats
domo-query-cli get-card "$CARD_ID" --export=both
```

### Update Dataset Properties
```bash
#!/bin/bash
# Update dataset properties with validation

DATASET_ID="12345678-abcd-1234-5678-901234567890"

# Update name only
domo-query-cli update-dataset-properties $DATASET_ID --name "Q4 Sales Data 2024" --no-confirm

# Update multiple properties
domo-query-cli update-dataset-properties $DATASET_ID \
  --name "Updated Dataset Name" \
  --description "This dataset contains sales data for Q4 2024" \
  --tags "sales,q4-2024,finance,reporting" \
  --no-confirm

# Update from JSON file
cat > dataset_props.json <<EOF
{
  "name": "Sales Dashboard Data",
  "description": "Primary data source for executive sales dashboard",
  "tags": ["sales", "dashboard", "executive", "2024"]
}
EOF

domo-query-cli update-dataset-properties $DATASET_ID --json-file dataset_props.json --no-confirm

# Update with inline JSON (useful for scripting)
domo-query-cli update-dataset-properties $DATASET_ID \
  --json '{"name":"Automated Update","tags":["automated","script"]}' \
  --no-confirm

# Get JSON output for automation
domo-query-cli update-dataset-properties $DATASET_ID \
  --name "New Name" \
  --format json \
  --no-confirm | jq '.data.result'
```

### Database Management
```bash
#!/bin/bash
# Complete database workflow example

# Initial setup - populate database
echo "Syncing all data from Domo..."
domo-query-cli db-sync --all

# Check database status
domo-query-cli db-status

# Export database before major changes
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).json"
domo-query-cli db-export "$BACKUP_FILE"
echo "Database backed up to: $BACKUP_FILE"

# Work offline with cached data
domo-query-cli get-dataset 123456 --offline
domo-query-cli list-datasets --offline

# Selective sync for specific data types
domo-query-cli db-sync --datasets  # Only sync datasets

# Clear old data and reimport
domo-query-cli db-clear --force
domo-query-cli db-import "$BACKUP_FILE"
```

### Offline Analysis
```bash
#!/bin/bash
# Perform analysis using only local database

# Ensure database is populated
domo-query-cli db-sync --datasets --cards

# Work entirely offline
export OFFLINE_MODE=true

# Get all datasets from local database
domo-query-cli list-datasets --offline --format json > all_datasets.json

# Analyze dataset information locally
cat all_datasets.json | jq '[.data.datasets[] | {
  id: .id,
  name: .name,
  rows: .rows,
  columns: .columns
}] | sort_by(.rows) | reverse | .[0:10]' > top_10_largest.json

echo "Top 10 largest datasets saved to top_10_largest.json"

# Generate reports from cached data
for dataset_id in $(cat all_datasets.json | jq -r '.data.datasets[].id' | head -5); do
  echo "Processing dataset: $dataset_id"
  domo-query-cli get-dataset "$dataset_id" --offline --format json > "dataset_${dataset_id}.json"
done
```

### Database Maintenance Script
```bash
#!/bin/bash
# Automated database maintenance

LOG_FILE="db_maintenance_$(date +%Y%m%d).log"

echo "Starting database maintenance - $(date)" >> "$LOG_FILE"

# Check current status
echo "Current database status:" >> "$LOG_FILE"
domo-query-cli db-status --format json | jq '.data.summary' >> "$LOG_FILE"

# Export current database
EXPORT_FILE="auto_backup_$(date +%Y%m%d).json"
domo-query-cli db-export "$EXPORT_FILE"
echo "Database exported to: $EXPORT_FILE" >> "$LOG_FILE"

# Sync fresh data
echo "Syncing fresh data..." >> "$LOG_FILE"
domo-query-cli db-sync --all --format json | jq '.data.syncResults' >> "$LOG_FILE"

# Clean up old backups (keep last 7)
find . -name "auto_backup_*.json" -mtime +7 -delete
echo "Old backups cleaned" >> "$LOG_FILE"

echo "Maintenance completed - $(date)" >> "$LOG_FILE"
```

### Batch Dataset Analysis with File Output
```bash
#!/bin/bash
# Analyze multiple datasets efficiently using file-based output

OUTPUT_DIR="/tmp/domo_analysis"
mkdir -p "$OUTPUT_DIR"

echo "Fetching dataset list..."
domo-query-cli list-datasets --limit 100 --output "$OUTPUT_DIR/all_datasets.json"

# Extract dataset IDs from the saved file
DATASET_IDS=$(jq -r '.data.datasets[].id' "$OUTPUT_DIR/all_datasets.json")

echo "Fetching details for each dataset..."
for id in $DATASET_IDS; do
  echo "  Processing dataset: $id"
  domo-query-cli get-dataset "$id" --output "$OUTPUT_DIR/dataset_${id}.json"
done

# Analyze saved datasets without hitting the API again
echo "Generating analysis report..."
jq -s '[.[] | .data.dataset | {
  id,
  name,
  rows,
  columns,
  sizeInBytes: (.rows * .columns * 100)
}] | sort_by(.sizeInBytes) | reverse | .[0:10]' \
  "$OUTPUT_DIR"/dataset_*.json > "$OUTPUT_DIR/top_10_largest.json"

echo "Analysis complete!"
echo "  - Dataset list: $OUTPUT_DIR/all_datasets.json"
echo "  - Individual details: $OUTPUT_DIR/dataset_*.json"
echo "  - Top 10 largest: $OUTPUT_DIR/top_10_largest.json"

# Generate a summary report
cat > "$OUTPUT_DIR/summary.txt" <<EOF
Dataset Analysis Report
Generated: $(date)

Total Datasets Analyzed: $(echo "$DATASET_IDS" | wc -w)

Top 10 Largest Datasets:
$(jq -r '.[] | "\(.name): \(.rows) rows x \(.columns) columns"' "$OUTPUT_DIR/top_10_largest.json")
EOF

echo "Summary report: $OUTPUT_DIR/summary.txt"
```

### Lineage Export for Multiple Datasets
```bash
#!/bin/bash
# Export lineage information for multiple datasets to files

DATASETS=(
  "abc-123-def-456"
  "def-456-ghi-789"
  "ghi-789-jkl-012"
)

LINEAGE_DIR="/tmp/lineage_exports"
mkdir -p "$LINEAGE_DIR"

echo "Exporting lineage for ${#DATASETS[@]} datasets..."

for dataset_id in "${DATASETS[@]}"; do
  echo "  Exporting lineage for: $dataset_id"

  # Get full lineage and save to file
  domo-query-cli get-dataset-lineage "$dataset_id" \
    --traverse-up=true \
    --traverse-down=true \
    --output "$LINEAGE_DIR/lineage_${dataset_id}.json"

  # Get just parents and save separately
  domo-query-cli get-dataset-parents "$dataset_id" \
    --output "$LINEAGE_DIR/parents_${dataset_id}.json"

  # Get just children and save separately
  domo-query-cli get-dataset-children "$dataset_id" \
    --output "$LINEAGE_DIR/children_${dataset_id}.json"
done

echo "Lineage export complete!"
echo "Files saved to: $LINEAGE_DIR"

# Generate a lineage summary
echo "Generating lineage summary..."
for dataset_id in "${DATASETS[@]}"; do
  PARENT_COUNT=$(jq '.data.parents | length' "$LINEAGE_DIR/parents_${dataset_id}.json")
  CHILD_COUNT=$(jq '.data.children | length' "$LINEAGE_DIR/children_${dataset_id}.json")

  echo "Dataset $dataset_id: $PARENT_COUNT parents, $CHILD_COUNT children"
done
```

## Troubleshooting

### Authentication Issues
```bash
# Test by listing datasets (will fail if auth is incorrect)
domo-query-cli list-datasets --limit 1
```

### Connection Issues
```bash
# Test basic connectivity
domo-query-cli list-datasets --limit 1
```

### Performance
```bash
# Limit results for faster response
domo-query-cli list-datasets --limit 10

# Use offset for pagination
domo-query-cli list-datasets --limit 10 --offset 20
```
