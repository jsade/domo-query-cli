# Domo Query CLI - Non-Interactive Command Guide

## Overview

The Domo Query CLI supports non-interactive command execution, allowing you to run commands directly from your terminal without entering the interactive shell. This is useful for scripting, automation, and quick one-off queries.

## Basic Usage

```bash
# Run a single command
domo-query <command> [options]

# With authentication
domo-query --token YOUR_API_TOKEN <command> [options]

# Run in read-only mode (prevents destructive operations)
domo-query --read-only <command> [options]
```

## Authentication

### Environment Variables
Set your credentials as environment variables to avoid passing them with each command:

```bash
export DOMO_API_TOKEN="your-api-token"
export DOMO_API_SECRET="your-api-secret"  # if using OAuth
export DOMO_INSTANCE="your-instance"      # e.g., "mycompany"
export DOMO_READ_ONLY="true"              # Enable read-only mode globally (optional)
```

### Command Line Options
```bash  
# Using API token
domo-query --token YOUR_TOKEN list datasets

# Using OAuth
domo-query --client-id YOUR_ID --client-secret YOUR_SECRET list datasets

# Specify instance
domo-query --instance mycompany list datasets
```

## Common Commands

### Dataset Operations

```bash
# List all datasets
domo-query list datasets

# Search datasets
domo-query search datasets "sales"

# Get dataset details
domo-query get dataset 12345678-abcd-1234-5678-901234567890

# Query a dataset
domo-query query dataset 12345678-abcd-1234-5678-901234567890 "SELECT * FROM table LIMIT 10"

# Export query results to CSV
domo-query query dataset 12345678-abcd-1234-5678-901234567890 "SELECT * FROM table" --output results.csv

# Export query results to JSON
domo-query query dataset 12345678-abcd-1234-5678-901234567890 "SELECT * FROM table" --format json --output results.json
```

### Dataflow Operations

```bash
# List dataflows
domo-query list dataflows

# Search dataflows
domo-query search dataflows "ETL"

# Get dataflow details
domo-query get dataflow 987654321

# Execute a dataflow
domo-query execute dataflow 987654321

# Check dataflow status
domo-query status dataflow 987654321
```

### Card Operations

```bash
# List cards
domo-query list cards

# Search cards
domo-query search cards "dashboard"

# Get card details
domo-query get card abc-123-def-456
```

### Data Source Operations

```bash
# List data sources
domo-query list datasources

# Get data source details
domo-query get datasource 555555
```

## Output Formats

### JSON Output (Default)
```bash
domo-query list datasets --format json
```

### CSV Output
```bash
domo-query query dataset 12345 "SELECT * FROM table" --format csv
```

### Table Output
```bash
domo-query list datasets --format table
```

### Plain Text Output
```bash
domo-query list datasets --format plain
```

## Filtering and Pagination

```bash
# Limit results
domo-query list datasets --limit 10

# Pagination
domo-query list datasets --page 2 --limit 20

# Filter by type
domo-query list datasets --type "database"

# Filter by owner
domo-query list datasets --owner "john.doe@company.com"
```

## Advanced Usage

### Piping and Redirection

```bash
# Pipe to other commands
domo-query query dataset 12345 "SELECT * FROM table" | jq '.results'

# Redirect to file
domo-query list datasets > datasets.json

# Process with grep
domo-query list datasets --format plain | grep "sales"
```

### Scripting Examples

```bash
#!/bin/bash
# Export all datasets to CSV files

for dataset_id in $(domo-query list datasets --format json | jq -r '.[] | .id'); do
  echo "Exporting dataset $dataset_id"
  domo-query query dataset "$dataset_id" "SELECT * FROM table" \
    --format csv \
    --output "export_${dataset_id}.csv"
done
```

### Batch Operations

```bash
# Execute multiple dataflows
for flow_id in 123 456 789; do
  domo-query execute dataflow $flow_id
done

# Check status of multiple datasets
domo-query list datasets --format json | \
  jq -r '.[] | .id' | \
  xargs -I {} domo-query get dataset {}
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
if domo-query execute dataflow 123; then
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
   domo-query list-dataflows  # Safe - read operation
   domo-query execute-dataflow 123  # Blocked - destructive operation
   ```

2. **Command Line Flag** (per session):
   ```bash
   domo-query --read-only list-datasets  # Safe
   domo-query --read-only execute-dataflow 123  # Blocked
   ```

### Operations Blocked in Read-Only Mode

The following operations are disabled when read-only mode is active:
- `execute-dataflow` - Executing dataflows
- `createDataflow` - Creating new dataflows  
- `updateDataflow` - Updating existing dataflows
- `patchDataflow` - Patching dataflow configurations
- `deleteDataflow` - Deleting dataflows

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
   alias domo-datasets='domo-query list datasets --format table'
   alias domo-exec='domo-query execute dataflow'
   ```

6. **Use `--verbose` flag** for debugging:
   ```bash
   domo-query --verbose query dataset 12345 "SELECT * FROM table"
   ```

## Examples

### Daily Report Generation
```bash
#!/bin/bash
# Generate daily sales report

DATASET_ID="sales-dataset-id"
TODAY=$(date +%Y-%m-%d)

domo-query query dataset "$DATASET_ID" \
  "SELECT * FROM sales WHERE date = '$TODAY'" \
  --format csv \
  --output "daily_report_$TODAY.csv"

echo "Report generated: daily_report_$TODAY.csv"
```

### Monitor Dataflow Execution
```bash
#!/bin/bash
# Execute dataflow and wait for completion

FLOW_ID=$1
domo-query execute dataflow "$FLOW_ID"

while true; do
  STATUS=$(domo-query status dataflow "$FLOW_ID" --format json | jq -r '.status')
  if [ "$STATUS" = "SUCCESS" ]; then
    echo "Dataflow completed successfully"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "Dataflow failed"
    exit 1
  fi
  echo "Status: $STATUS - waiting..."
  sleep 10
done
```

### Bulk Dataset Export
```bash
#!/bin/bash
# Export multiple datasets matching a pattern

domo-query search datasets "sales" --format json | \
  jq -r '.[] | "\(.id):\(.name)"' | \
  while IFS=: read -r id name; do
    filename=$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
    echo "Exporting $name to ${filename}.csv"
    domo-query query dataset "$id" "SELECT * FROM table" \
      --format csv \
      --output "${filename}.csv"
  done
```

## Troubleshooting

### Authentication Issues
```bash
# Test authentication
domo-query test auth

# Verbose output for debugging
domo-query --verbose list datasets
```

### Connection Issues
```bash
# Test with proxy settings
domo-query --proxy-host proxy.company.com --proxy-port 8080 list datasets

# Bypass SSL verification (not recommended for production)
domo-query --no-verify-ssl list datasets
```

### Performance
```bash
# Limit results for faster response
domo-query list datasets --limit 10

# Use specific fields only
domo-query query dataset 12345 "SELECT id, name, date FROM table LIMIT 100"
```

## Help and Documentation

```bash
# General help
domo-query --help

# Command-specific help
domo-query list --help
domo-query query --help

# Version information
domo-query --version
```