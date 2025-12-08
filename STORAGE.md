# Storage & Caching System

## Overview

The Domo Query CLI includes an intelligent caching system that automatically speeds up repeated API calls. This system works transparently in the background - you don't need to configure anything to benefit from it.

## How It Works

### Automatic Operation
When you run any command that fetches data from Domo's API, the CLI automatically:
1. Checks if the data is already cached
2. Returns cached data if available and fresh (within 1 hour)
3. Fetches from API if cache is empty or expired
4. Stores the fresh data in cache for future use

### What Gets Cached
- Dataset listings and searches
- Individual dataset details
- Dataflow information
- Card data
- API responses with their specific parameters

### Cache Duration
- **Default TTL**: 1 hour (data expires after 60 minutes)
- **Scope**: Per CLI session (cache is cleared when you exit)
- **Storage**: In-memory only (no files or database)

## User Commands

### Check Cache Status
```bash
# View current cache statistics
cache-status

# Example output:
# Cache Status:
# Memory Entries: 12
# Total Size: 145.3 KB
# Status: Active
# Avg Entry Size: 12.1 KB
```

### Clear Cache
```bash
# Clear all cached data
cache-status --clear

# Output:
# Cache cleared successfully.
# 
# Cache Status:
# Memory Entries: 0
# Total Size: 0 B
# Status: Empty
```

### JSON Output
```bash
# Get cache status in JSON format for scripts
cache-status --format=json
```

## Real-World Examples

### Example 1: Listing Datasets
```bash
# First call - fetches from API (slower, ~500-1000ms)
list-datasets
# Fetching all datasets...
# 150 datasets

# Second call - returns from cache (instant, ~5ms)
list-datasets  
# 150 datasets

# Search also gets cached separately
list-datasets "sales"
# 12 datasets matching "sales"
```

### Example 2: Working with Specific Datasets
```bash
# First access to dataset
get-dataset abc123
# [Fetches from API]

# Subsequent access within 1 hour
get-dataset abc123
# [Returns instantly from cache]

# After updating the dataset
update-dataset abc123 --name="New Name"
# [Cache for this dataset is automatically cleared]

get-dataset abc123
# [Fetches fresh data from API]
```

### Example 3: Pagination
```bash
# Each page is cached independently
list-datasets --limit=50 --offset=0   # Page 1 - cached
list-datasets --limit=50 --offset=50  # Page 2 - cached separately
list-datasets --limit=50 --offset=0   # Page 1 - returns from cache
```

## Performance Benefits

| Operation | Without Cache | With Cache (2nd call) | Improvement |
|-----------|--------------|----------------------|-------------|
| list-datasets | 500-2000ms | 1-5ms | ~100-400x faster |
| get-dataset | 200-500ms | 1-3ms | ~100x faster |
| list-dataflows | 300-1000ms | 1-5ms | ~100-200x faster |

## Smart Cache Invalidation

The cache automatically clears when you:
- Update a dataset's properties
- Modify a dataflow
- Delete resources
- Make any change that affects the cached data

This ensures you always see fresh data after making changes.

## FAQ

### Cache Questions

**Q: Do I need to configure the cache?**
No, it works automatically with optimal defaults.

**Q: Where is cached data stored?**
In memory only. No files are created on your disk for caching.

**Q: What happens when I exit the CLI?**
All cached data is cleared. Each CLI session starts fresh.

**Q: Can I disable caching?**
Currently caching is always on, but you can clear it anytime with `cache-status --clear`.

**Q: How much memory does the cache use?**
Typically just a few MB. Check with `cache-status` to see current usage.

**Q: Will I ever see outdated data?**
Cache expires after 1 hour, and updates trigger immediate invalidation, so stale data is very unlikely.

**Q: Why isn't my repeated command faster?**
Different parameters create different cache entries. For example, `list-datasets` and `list-datasets "sales"` are cached separately.

### JSON Export Questions

**Q: Where are exported JSON files saved?**
By default in `./exports` directory. Use `--export-path=/custom/path` to change location, or set `DOMO_EXPORT_PATH` environment variable.

**Q: Can I export data automatically on every command?**
Not by default, but you can create shell aliases or wrapper scripts that add `--export` to commands.

**Q: What's the difference between `--export` and `--format=json`?**
`--export` writes to a timestamped file, while `--format=json` outputs to stdout for piping or redirection. You can use both together: `--format=json --export` outputs JSON to stdout AND saves to a file.

**Q: How large can exported JSON files get?**
File size depends on your data volume. A typical export of 1000 datasets is around 500KB-2MB.

**Q: Can I import exported JSON back into Domo?**
The exported JSON is read-only metadata. Use Domo's API or web interface for data updates.

### Database Questions

**Q: Is the local database required?**
No, it's optional. The CLI works fine without it, but the database enables offline browsing and search.

**Q: How much disk space does the database use?**
Usually 10-100MB depending on your Domo instance size. Check with `db-stats` command.

**Q: Are database backups automatic?**
Yes, the last 10 versions of each collection are kept automatically in the backups folder.

**Q: Can I share my database with team members?**
Yes, use `db-export` to create a portable JSON file, then share it. Others can `db-import` it.

**Q: What happens if the database gets corrupted?**
The CLI will recreate it automatically. You can also restore from backups or use `db-import`.

**Q: Can I have multiple database instances?**
Yes, the database supports multiple instances through the instance name parameter (advanced use).

### General Storage Questions

**Q: What's the difference between cache and database?**
Cache is temporary (1-hour TTL, memory-only) for performance. Database is persistent (disk-based) for long-term storage.

**Q: Should I commit exported files to git?**
Generally no, unless you're specifically tracking changes over time. Add `exports/` to `.gitignore`.

**Q: Can I customize the timestamp format in filenames?**
Not currently, but you can rename files after export or use shell scripts for custom naming.

**Q: Is sensitive data encrypted in storage?**
Cache and exports are not encrypted. Use filesystem encryption if you need security. Authentication tokens are stored securely in the system keychain.

## Troubleshooting

### Issue: Seeing old data after an external update
**Solution:** If someone else updated data in Domo, clear your cache:
```bash
cache-status --clear
```

### Issue: Want to force a fresh API call
**Solution:** Clear cache before your command:
```bash
cache-status --clear && list-datasets
```

### Issue: Memory concerns on limited systems
**Solution:** Periodically clear cache during long sessions:
```bash
cache-status --clear
```

## Technical Details

- **Cache Keys**: Generated using MD5 hash of request parameters
- **Implementation**: Singleton CacheManager class
- **Data Structure**: In-memory Map with TTL tracking
- **Invalidation**: Pattern-based and specific key invalidation
- **Thread Safety**: Single-threaded Node.js event loop

## JSON Export & Storage

The CLI provides flexible export capabilities to save your data for later use, sharing, or integration with other tools.

### Export Options

Most data-fetching commands support these export options:

- **`--export`** or **`--export=json`**: Export data to JSON file
- **`--export=md`**: Export data to Markdown file (human-readable format)
- **`--export=both`**: Export to both JSON and Markdown formats
- **`--export-path=<directory>`**: Specify custom export directory (default: `./exports`)

> **Note:** Legacy flags (`--save`, `--save-json`, `--save-md`, `--save-both`, `--path`) are still supported as aliases for backward compatibility, but the `--export*` flags are now preferred.

### File Naming Convention

Exported files use timestamped names to prevent overwrites:
```
<prefix>_YYYY_MM_DD_HHMMSS.<format>
```

Example: `datasets_2025_01_15_143052.json`

### Export Examples

```bash
# Export dataset list to JSON
list-datasets --export

# Export to Markdown for documentation
list-datasets --export=md

# Export to both formats with custom path
list-datasets --export=both --export-path=/Users/me/reports

# Export filtered results
list-datasets "sales" --export=json

# Export with pagination
list-datasets --limit=50 --export

# Combine JSON format output with export (outputs to stdout AND saves to file)
list-datasets --format=json --export | jq '.datasets[0].name'
```

### JSON Output Format

For programmatic access, use `--format=json` to output results directly to stdout:

```bash
# Get JSON output for scripting
list-datasets --format=json | jq '.datasets[0].name'

# Pipe to file
list-datasets --format=json > datasets.json

# Use with other tools
cache-status --format=json | python analyze.py

# Combine JSON output with export (outputs to stdout AND saves to file)
list-datasets --format=json --export
```

### Export Behavior & Precedence

Understanding how export flags interact with other output options:

- **`--format=json` + `--export`**: Outputs JSON to stdout AND saves to timestamped file (both happen)
- **`--output=<path>` + `--export`**: The `--output` flag takes precedence; export is ignored
- **`--quiet` mode**: Suppresses export confirmation messages, but export still happens
- **Multiple formats**: Use `--export=both` to generate both JSON and Markdown files simultaneously

## Local Database Storage

The CLI includes a persistent JSON database for storing and managing Domo metadata locally.

### Database Location

The database is stored in your home directory:
- **Default Path**: `~/.domo-cli/db/default/`
- **Structure**: Each collection stored as separate JSON file
- **Backups**: Automatic backups in `~/.domo-cli/db/default/backups/`

### Database Features

- **Persistent Storage**: Data survives between CLI sessions
- **Automatic Backups**: Last 10 versions kept for each collection
- **Atomic Writes**: Safe concurrent access
- **Metadata Tracking**: Timestamps and source tracking for all entities
- **Search Capability**: Full-text search across collections

### Database Commands

```bash
# Export entire database
db-export
# Creates: domo-db-export_YYYY_MM_DD_HHMMSS.json

# Export to specific location
db-export /path/to/backup.json

# Import database
db-import /path/to/backup.json

# View database statistics
db-stats
```

### What Gets Stored in Database

The local database stores:
- Dataset metadata and schemas
- Dataflow configurations
- Card definitions
- Page structures
- Execution history
- Custom mappings and relationships

## Storage Formats Comparison

| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| **JSON** | Programmatic access, automation | Machine-readable, preserves data types, easy to parse | Large file sizes, not human-friendly |
| **Markdown** | Documentation, reports, sharing | Human-readable, great for tables, easy to view | Loses data type precision, not for automation |
| **Database** | Persistent local storage | Fast queries, relationships, search | Requires CLI to access |
| **Cache** | Temporary performance boost | Instant access, automatic management | Expires after 1 hour, session-only |

## Advanced Export Examples

### Automated Reports

```bash
#!/bin/bash
# Daily dataset report script

# Create reports directory
mkdir -p ~/domo-reports/$(date +%Y-%m)

# Export all datasets
list-datasets --export=both --export-path=~/domo-reports/$(date +%Y-%m)

# Export specific dataflows
list-dataflows "ETL" --export=md --export-path=~/domo-reports/$(date +%Y-%m)

# Generate summary
echo "Report generated: $(date)" >> ~/domo-reports/summary.log
```

### JSON Processing Pipeline

```bash
# Extract and transform data
list-datasets --format=json | \
  jq '.datasets[] | select(.rows > 1000000) | {name, rows, columns}' | \
  jq -s '.' > large_datasets.json

# Count datasets by update date
list-datasets --format=json | \
  jq '.datasets | group_by(.updatedAt[:10]) | map({date: .[0].updatedAt[:10], count: length})'
```

### Markdown Documentation

```bash
# Create comprehensive documentation
echo "# Domo Data Catalog" > catalog.md
echo "Generated: $(date)" >> catalog.md
echo "" >> catalog.md

# Add datasets section
list-datasets --export=md
cat exports/datasets_*.md >> catalog.md

# Add dataflows section
list-dataflows --export=md
cat exports/dataflows_*.md >> catalog.md
```

## Summary

The Domo Query CLI provides three complementary storage systems:

1. **Cache**: Automatic, transparent performance optimization (1-hour TTL, memory-only)
2. **JSON Export**: Flexible data export for sharing and automation (timestamped files)
3. **Local Database**: Persistent metadata storage with search and relationships

Each system serves a specific purpose, and they work together to provide a comprehensive data management solution. The caching system speeds up your work transparently, exports let you share and process data externally, and the local database maintains a searchable catalog of your Domo resources.

---

*Note: Storage paths can be customized via environment variables:*
- `DOMO_EXPORT_PATH`: Default export directory (default: `./exports`)
- `DOMO_DB_PATH`: Database location (default: `~/.domo-cli/db`)