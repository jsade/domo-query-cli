---
created: 2025-08-20 18:04:14
updated: 2025-08-21 21:03:47
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
    - [Lineage and Reporting](#lineage-and-reporting)
- [Output Formats](#output-formats)
    - [JSON Output](#json-output)
    - [Standard Output (formatted for terminal)](#standard-output-formatted-for-terminal)
- [Filtering and Pagination](#filtering-and-pagination)
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

# Get dataset lineage (requires API token and DOMO_API_HOST)
domo-query-cli get-dataset-lineage 12345678-abcd-1234-5678-901234567890
domo-query-cli get-dataset-lineage 12345678-abcd-1234-5678-901234567890 --traverse-up=true --traverse-down=true
domo-query-cli get-dataset-lineage 12345678-abcd-1234-5678-901234567890 --entities=DATA_SOURCE,DATAFLOW

# Update dataset properties (requires API token)
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --name "New Dataset Name"
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --description "Updated description" --tags "sales,2024,finance"
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --json '{"name":"New Name","tags":["tag1","tag2"]}'
domo-query-cli update-dataset-properties 12345678-abcd-1234-5678-901234567890 --json-file properties.json --no-confirm
```

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
domo-query-cli get-dataset-lineage dataset-id --format=json --save

# Generate lineage report
domo-query-cli generate-lineage-report dataset-id

# Check cache status
domo-query-cli cache-status
```

## Output Formats

### JSON Output
```bash
domo-query-cli --command "list-datasets" --format json
```

### Standard Output (formatted for terminal)
```bash
domo-query-cli list-datasets
```

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

# Save card details to markdown documentation
domo-query-cli get-card "$CARD_ID" --save-md --path ./docs

# Save to both JSON and Markdown formats
domo-query-cli get-card "$CARD_ID" --save-both
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

