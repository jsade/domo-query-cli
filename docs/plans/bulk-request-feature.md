# Bulk Request Feature Implementation Plan

**Created**: 2025-11-02
**Status**: Planning Complete - Ready for Implementation (Enhanced with Agent A/B recommendations)
**Estimated Timeline**: 7 phases, ~5-6 hours with parallel subagent work

## Overview

Add bulk request capability to 9 existing commands, allowing users to process multiple IDs in a single operation with parallel execution, individual error handling, and filesystem-based output.

## Requirements

### Commands to Support Bulk Operations
1. `get-dataset` → `bulk-get-datasets`
2. `get-dataflow` → `bulk-get-dataflows`
3. `get-card` → `bulk-get-cards`
4. `render-card` → `bulk-render-cards`
5. `get-dataset-lineage` → `bulk-get-dataset-lineage`
6. `get-dataset-parents` → `bulk-get-dataset-parents`
7. `get-dataset-children` → `bulk-get-dataset-children`
8. `get-dataflow-lineage` → `bulk-get-dataflow-lineage`
9. `generate-lineage-report` → `bulk-generate-lineage-reports`

### Input Method
- Comma-separated list of IDs as first positional argument
- Example: `bulk-get-datasets ds1,ds2,ds3`

### Output Method
- **Separate files per entity**: `{entity-type}-{id}.json` (e.g., `dataset-abc123.json`)
- **Summary file**: `bulk-{command}-summary.json` with metadata
- **Filesystem required**: All bulk operations must write to `DOMO_OUTPUT_PATH`
- **JSON output only**: Return request status, file paths, and sizes (not full data)

### MCP Integration
- **Single tool**: `batch-get`
- **Parameters**:
  - `command`: enum ["dataset", "dataflow", "card", "render-card", "dataset-lineage", "dataset-parents", "dataset-children", "dataflow-lineage", "lineage-report"]
  - `ids`: string (comma-separated)
  - `outputPath`: string (required)
  - Optional command-specific params (e.g., `traverseUp`, `traverseDown` for lineage)

## Design Decisions (Confirmed)

| Decision Area | Choice | Rationale |
|--------------|--------|-----------|
| **Error Handling** | Continue on error | Process all IDs, report failures individually. More robust for large batches. |
| **Output Format** | Separate files | One file per entity. Better for large batches, easier to process individually. |
| **Concurrency** | Parallel (limited) | Process multiple IDs concurrently with limit of 10. Fast but controlled. |
| **Batch Size** | 500 IDs max | Prevents resource exhaustion, encourages reasonable chunking. |
| **Progress Reporting** | None (non-interactive) | Optional spinner for interactive mode only. |

## Architecture

### Current Implementation Patterns (from exploration)

**Command Structure**:
- All commands extend `BaseCommand`
- Standard pattern: parse args → validate → API call → output
- Error handling: try-catch with JSON/console error output
- Output path: `FileOutputWriter.writeJsonToFile()` with `DOMO_OUTPUT_PATH` sandboxing

**API Clients**:
- Single-entity functions only (no built-in bulk operations)
- Example: `getDataset(id)`, `getCard(id)`, `getDataflowLineage(id, params)`
- Need to implement bulk at command level

**Existing Bulk-Like Patterns**:
- `get-dataset-parents`: Uses `Promise.all()` for parallel enrichment
- `generate-lineage-report`: Fetches all dataflows then processes
- Pattern to follow: Parallel with per-item error handling

### New Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  BulkGetDatasetCommand, BulkGetCardCommand, etc.                │
│  • Parse comma-separated IDs                                     │
│  • Validate batch size (≤500)                                   │
│  • Require output path                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BulkRequestExecutor                            │
│  • Generic executeBulk<T>(ids, fetchFn)                         │
│  • Parallel processing with pLimit (concurrency: 10)            │
│  • Per-item error handling (continue on error)                  │
│  • Returns: { success: T[], failed: {id, error}[] }            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BulkFileWriter                               │
│  • writeBulkResults(results, entityType, outputPath)            │
│  • File naming: {entity-type}-{id}.json                         │
│  • Respects DOMO_OUTPUT_PATH sandboxing                         │
│  • Generates summary file with metadata                         │
│  • Returns: { files: [], summary: {}, errors: [] }             │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 0: Validation Spike

**Estimated Time**: 30 minutes
**Subagent**: General-purpose agent
**Goal**: Prove core architecture with single command before scaling to 9 commands

#### Objectives
1. Validate BulkRequestExecutor pattern with real API
2. Test rate limiting behavior with Domo API
3. Verify concurrency assumptions (is 10 optimal?)
4. Ensure error handling works as expected (continue-on-error)
5. Validate file output with DOMO_OUTPUT_PATH sandboxing

#### Implementation
- Create minimal `BulkRequestExecutor` with core features
- Implement single command: `bulk-get-datasets`
- Test with 50 IDs against real/mock Domo API
- Observe rate limiting behavior (429 responses)
- Measure execution time and resource usage

#### Success Criteria
- ✅ BulkRequestExecutor successfully processes 50 IDs
- ✅ Error handling works (continue-on-error demonstrated)
- ✅ File output respects DOMO_OUTPUT_PATH
- ✅ No unexpected rate limiting issues
- ✅ Concurrency limit of 10 is validated or adjusted

#### Decision Gate
- **If spike succeeds** → Proceed to Phase 1 (full infrastructure)
- **If spike reveals issues** → Revise architecture before proceeding
- **If rate limits are hit** → Adjust concurrency limit based on findings

---

### Phase 1: Core Infrastructure (Enhanced)

**Estimated Time**: 90 minutes (expanded from 45 min to include rate limit handling and timeout logic)
**Subagent**: General-purpose agent
**Files to Create**:
- `src/utils/BulkRequestExecutor.ts`
- `src/utils/BulkFileWriter.ts`

#### BulkRequestExecutor.ts (Enhanced)

```typescript
interface BulkError {
  code: string;
  message: string;
  httpStatus?: number;
  retryable?: boolean;
  retriesAttempted?: number;
}

interface BulkResult<T> {
  success: Array<{ id: string; data: T }>;
  failed: Array<{ id: string; error: BulkError }>;
}

interface BulkOptions {
  concurrency?: number;           // Default: 10
  requestTimeoutMs?: number;      // Default: 30000 (30 sec per request)
  totalTimeoutMs?: number;        // Default: 600000 (10 min for entire batch)
  maxRetries?: number;            // Default: 3
  enableCircuitBreaker?: boolean; // Default: true
}

export class BulkRequestExecutor {
  static async executeBulk<T>(
    ids: string[],
    fetchFn: (id: string) => Promise<T>,
    options: BulkOptions = {}
  ): Promise<BulkResult<T>>
}
```

**Features**:
- Generic `executeBulk<T>()` method
- Use `p-limit` for concurrency control (default: 10)
- Per-item try-catch: continue on error
- Structured return: successful results + failed items with errors
- **NEW: Rate limit handling**
  - Detect HTTP 429 responses
  - Exponential backoff (1s, 2s, 4s, 8s, 16s)
  - Max 3 retries per ID (configurable)
  - Honor `Retry-After` header if present
- **NEW: Timeout configuration**
  - Per-request timeout (default: 30 seconds)
  - Total batch timeout (default: 10 minutes)
  - Abort remaining requests if total timeout exceeded
- **NEW: Circuit breaker**
  - Monitor failure rate during execution
  - If failure rate > 50% after 20 requests → abort remaining
  - Prevents wasting time when API is clearly down
- **NEW: Structured error contract**
  - Error includes `code`, `message`, `httpStatus`
  - `retryable` flag indicates if retry would help
  - `retriesAttempted` tracks retry count

#### BulkFileWriter.ts

```typescript
interface BulkWriteResult {
  summaryFile: { path: string; size: number };
  entityFiles: Array<{ id: string; path: string; size: number }>;
  errors: Array<{ id: string; error: BulkError }>;
}

export class BulkFileWriter {
  static async writeBulkResults<T>(
    results: BulkResult<T>,
    entityType: string,
    outputPath: string
  ): Promise<BulkWriteResult>
}
```

**Features**:
- Write individual files: `{entityType}-{id}.json`
- Write summary file: `bulk-{entityType}-summary.json`
- Respect `DOMO_OUTPUT_PATH` sandboxing via `FileOutputWriter`
- Return metadata: file paths + sizes for each entity
- Include error summary in summary file (with structured error details)

**Dependencies to check**:
- Check if `p-limit` is in `package.json`, add if missing

---

### Phase 2: Bulk CLI Commands

**Estimated Time**: 90 minutes (parallelizable across 9 commands)
**Subagent**: General-purpose agent (can parallelize per command)
**Files to Create**: 9 new command files

#### Command List:
1. `src/commands/BulkGetDatasetCommand.ts`
2. `src/commands/BulkGetDataflowCommand.ts`
3. `src/commands/BulkGetCardCommand.ts`
4. `src/commands/BulkRenderCardCommand.ts`
5. `src/commands/BulkGetDatasetLineageCommand.ts`
6. `src/commands/BulkGetDatasetParentsCommand.ts`
7. `src/commands/BulkGetDatasetChildrenCommand.ts`
8. `src/commands/BulkGetDataflowLineageCommand.ts`
9. `src/commands/BulkGenerateLineageReportCommand.ts`

#### Shared Command Pattern

```typescript
export class BulkGetDatasetCommand extends BaseCommand {
  name = "bulk-get-datasets";
  description = "Fetch multiple datasets by comma-separated IDs";

  async execute(args?: string[]): Promise<void> {
    // 1. Parse comma-separated IDs
    const ids = this.parseCommaSeparatedIds(args[0]);

    // 2. Validate batch size (≤500)
    if (ids.length > 500) {
      throw new Error("BULK_BATCH_SIZE_EXCEEDED");
    }

    // 3. Require output path
    if (!domoConfig.outputPath) {
      throw new Error("BULK_OUTPUT_PATH_REQUIRED");
    }

    // 4. Execute bulk request
    const results = await BulkRequestExecutor.executeBulk(
      ids,
      (id) => getDataset(id),
      { concurrency: 10 }
    );

    // 5. Write to filesystem
    const writeResult = await BulkFileWriter.writeBulkResults(
      results,
      "dataset",
      domoConfig.outputPath
    );

    // 6. Output summary (JSON format)
    this.outputSummary(writeResult);
  }
}
```

#### Command-Specific Considerations

**BulkGetDatasetCommand**:
- API: `getDataset(id)`
- Cache support: Respect `--sync` and `--offline` flags
- Auth: Any method

**BulkGetDataflowCommand**:
- API: `getDataflowDual(id, authMethod)` for consistency with single command
- Auth: API token required
- Returns: v1 + v2 merged data

**BulkGetCardCommand**:
- API: `getCard(id)`
- Simple pattern
- Auth: Any method

**BulkRenderCardCommand**:
- API: `renderKpiCard(id, parts, options)`
- Special: Each card generates multiple files (image, summary, full response)
- File naming: `card-{id}-image.png`, `card-{id}-summary.json`, `card-{id}-full.json`

**BulkGetDatasetLineageCommand**:
- API: `getDatasetLineage(id, queryParams)`
- Query params: `traverseUp`, `traverseDown`, `requestEntities`
- Auth: API token + DOMO_API_HOST required

**BulkGetDatasetParentsCommand**:
- Pattern: Fetch lineage + enrich with names
- API: `getDatasetLineage(id)` then parallel enrichment
- Auth: API token required

**BulkGetDatasetChildrenCommand**:
- Same pattern as parents
- API: `getDatasetLineage(id)` then parallel enrichment
- Auth: API token required

**BulkGetDataflowLineageCommand**:
- API: `getDataflowLineage(id, queryParams)`
- Query params: Similar to dataset lineage
- Auth: API token required

**BulkGenerateLineageReportCommand**:
- Special: Each ID generates markdown report
- API: `getDataflowLineage(id)` + build graph
- Output: `dataflow-{id}-lineage-report.md`
- Auth: API token required

#### Helper Methods

Add to `CommandUtils.ts`:
```typescript
static parseCommaSeparatedIds(input: string): string[] {
  return input.split(',').map(id => id.trim()).filter(id => id.length > 0);
}

static validateBatchSize(ids: string[], max: number = 500): void {
  if (ids.length > max) {
    throw new Error(`Batch size ${ids.length} exceeds maximum ${max}`);
  }
}
```

#### Error Codes

Add to error handling:
- `BULK_BATCH_SIZE_EXCEEDED`: "Batch size exceeds maximum of 500 IDs"
- `BULK_OUTPUT_PATH_REQUIRED`: "DOMO_OUTPUT_PATH must be set for bulk operations"
- `BULK_PARTIAL_FAILURE`: "Some items failed to process"
- `BULK_INVALID_IDS`: "No valid IDs provided"
- **NEW: `RATE_LIMITED`**: "API rate limit exceeded" (retryable: true)
- **NEW: `REQUEST_TIMEOUT`**: "Request timed out after X seconds" (retryable: true)
- **NEW: `TOTAL_TIMEOUT_EXCEEDED`**: "Batch operation exceeded maximum time limit" (retryable: false)
- **NEW: `CIRCUIT_BREAKER_TRIPPED`**: "Bulk operation aborted due to high failure rate" (retryable: false)

#### JSON Output Format (Enhanced)

```json
{
  "success": true,
  "command": "bulk-get-datasets",
  "summary": {
    "total": 10,
    "succeeded": 8,
    "failed": 2,
    "batchSizeLimit": 500
  },
  "files": [
    { "id": "ds1", "path": "/path/dataset-ds1.json", "size": 1234 },
    { "id": "ds3", "path": "/path/dataset-ds3.json", "size": 2345 }
  ],
  "errors": [
    {
      "id": "ds2",
      "error": {
        "code": "NOT_FOUND",
        "message": "Dataset not found",
        "httpStatus": 404,
        "retryable": false
      }
    },
    {
      "id": "ds5",
      "error": {
        "code": "RATE_LIMITED",
        "message": "API rate limit exceeded",
        "httpStatus": 429,
        "retryable": true,
        "retriesAttempted": 3
      }
    }
  ],
  "summaryFile": {
    "path": "/path/bulk-dataset-summary.json",
    "size": 567
  }
}
```

---

### Phase 3: MCP Integration

**Estimated Time**: 20 minutes
**Subagent**: General-purpose agent
**File to Update**: `mcp/mcp-server.ts`

#### Add Single Tool: `batch-get`

```typescript
{
  name: "batch-get",
  description: "Execute bulk get operations for multiple IDs",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        enum: [
          "dataset",
          "dataflow",
          "card",
          "render-card",
          "dataset-lineage",
          "dataset-parents",
          "dataset-children",
          "dataflow-lineage",
          "lineage-report"
        ],
        description: "Type of entity to fetch"
      },
      ids: {
        type: "string",
        description: "Comma-separated list of entity IDs"
      },
      outputPath: {
        type: "string",
        description: "Directory path for output files (required)"
      },
      // Optional lineage params
      traverseUp: {
        type: "boolean",
        description: "For lineage commands: include upstream dependencies"
      },
      traverseDown: {
        type: "boolean",
        description: "For lineage commands: include downstream dependents"
      },
      entities: {
        type: "boolean",
        description: "For lineage commands: include full entity details"
      }
    },
    required: ["command", "ids", "outputPath"]
  }
}
```

#### Command Mapping

```typescript
const commandMap: Record<string, string> = {
  "dataset": "bulk-get-datasets",
  "dataflow": "bulk-get-dataflows",
  "card": "bulk-get-cards",
  "render-card": "bulk-render-cards",
  "dataset-lineage": "bulk-get-dataset-lineage",
  "dataset-parents": "bulk-get-dataset-parents",
  "dataset-children": "bulk-get-dataset-children",
  "dataflow-lineage": "bulk-get-dataflow-lineage",
  "lineage-report": "bulk-generate-lineage-reports"
};
```

#### Execution Pattern

```typescript
case "batch-get": {
  const { command, ids, outputPath, ...optionalParams } = args;
  const cliCommand = commandMap[command];

  const commandArgs = [ids];

  // Add output path
  commandArgs.push(`--output=${outputPath}`);

  // Add optional lineage params if present
  if (optionalParams.traverseUp) commandArgs.push("--traverse-up");
  if (optionalParams.traverseDown) commandArgs.push("--traverse-down");
  if (optionalParams.entities) commandArgs.push("--entities");

  // Execute via NonInteractiveExecutor
  const result = await executeCommand(cliCommand, commandArgs);

  // Format response
  return formatMcpResponse(result);
}
```

#### MCP Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "Bulk Operation Summary:\n\nTotal: 10 IDs\nSucceeded: 8\nFailed: 2\n\nFiles Created:\n- /path/dataset-ds1.json (1.2 KB)\n- /path/dataset-ds3.json (2.3 KB)\n...\n\nErrors:\n- ds2: Dataset not found\n- ds5: Permission denied\n\nSummary file: /path/bulk-dataset-summary.json (567 bytes)"
  }]
}
```

---

### Phase 4: Testing

**Estimated Time**: 60 minutes
**Subagent**: General-purpose agent (Debugger if issues arise)

#### Unit Tests to Create

**`src/utils/BulkRequestExecutor.test.ts`**:
- ✅ Should process all IDs successfully
- ✅ Should handle partial failures (continue on error)
- ✅ Should respect concurrency limit
- ✅ Should handle empty ID array
- ✅ Should propagate errors correctly
- **NEW: ✅ Should retry on 429 responses with exponential backoff**
- **NEW: ✅ Should honor Retry-After header**
- **NEW: ✅ Should respect per-request timeout**
- **NEW: ✅ Should respect total batch timeout**
- **NEW: ✅ Should trigger circuit breaker at 50% failure rate**
- **NEW: ✅ Should include structured error details (code, httpStatus, retryable)**

**`src/utils/BulkFileWriter.test.ts`**:
- ✅ Should write individual entity files
- ✅ Should write summary file with metadata
- ✅ Should respect DOMO_OUTPUT_PATH sandboxing
- ✅ Should generate correct file names
- ✅ Should include error details in summary

**Command Tests** (create for each bulk command):
- `src/commands/BulkGetDatasetCommand.test.ts`
- `src/commands/BulkGetDataflowCommand.test.ts`
- (etc. for all 9 commands)

**Test pattern for commands**:
- ✅ Should parse comma-separated IDs correctly
- ✅ Should validate batch size limit (500)
- ✅ Should require DOMO_OUTPUT_PATH
- ✅ Should handle authentication requirements
- ✅ Should output correct JSON format
- ✅ Should handle partial failures gracefully

#### Integration Tests

**`src/commands/bulk-integration.test.ts`**:
- ✅ Test with mock API responses
- ✅ Test error scenarios (not found, auth failure)
- ✅ Test batch size limit enforcement
- ✅ Test file output with DOMO_OUTPUT_PATH
- ✅ Test MCP tool invocation

#### Test Commands

```bash
# Run specific test files
yarn test src/utils/BulkRequestExecutor.test.ts
yarn test src/utils/BulkFileWriter.test.ts
yarn test src/commands/BulkGet*.test.ts

# Run all tests
yarn test

# Watch mode during development
yarn test:watch

# Coverage report
yarn test:coverage
```

---

### Phase 5: Documentation

**Estimated Time**: 40 minutes (expanded to document rate limiting and timeout features)
**Subagent**: Alice (documentation specialist)

#### Update `CLI.md`

**Add new section**: "Bulk Operations"

```markdown
## Bulk Operations

Execute operations on multiple entities in a single command. All bulk operations:
- Accept comma-separated IDs as input
- Write results to separate files (one per entity)
- Require DOMO_OUTPUT_PATH environment variable
- Support up to 500 IDs per request
- Continue processing on individual failures
- Return summary with file paths and error details

### Available Bulk Commands

#### bulk-get-datasets

Fetch multiple datasets by ID.

**Usage**:
```bash
# Interactive mode
bulk-get-datasets ds1,ds2,ds3

# Non-interactive mode
domo-query-cli bulk-get-datasets ds1,ds2,ds3
```

**Output**:
- Individual files: `dataset-{id}.json`
- Summary file: `bulk-dataset-summary.json`

**Example output**:
```json
{
  "success": true,
  "summary": { "total": 3, "succeeded": 2, "failed": 1 },
  "files": [
    { "id": "ds1", "path": "/output/dataset-ds1.json", "size": 1234 },
    { "id": "ds3", "path": "/output/dataset-ds3.json", "size": 2345 }
  ],
  "errors": [
    { "id": "ds2", "error": "Dataset not found" }
  ]
}
```

(Continue for all 9 bulk commands...)
```

**Documentation requirements**:
- Command description and purpose
- Usage examples (interactive + non-interactive)
- Input format (comma-separated IDs)
- Output format (file naming, JSON structure)
- Error handling behavior
- Authentication requirements
- Batch size limits

#### Update `MCP.md`

**Add new tool**: `batch-get`

```markdown
### batch-get

Execute bulk get operations for multiple IDs.

**Parameters**:
- `command` (required): Type of entity ["dataset", "dataflow", "card", etc.]
- `ids` (required): Comma-separated list of IDs
- `outputPath` (required): Directory for output files
- `traverseUp` (optional): For lineage commands
- `traverseDown` (optional): For lineage commands
- `entities` (optional): For lineage commands

**Command mapping**:
- `dataset` → `bulk-get-datasets`
- `dataflow` → `bulk-get-dataflows`
- (etc.)

**Example**:
```json
{
  "command": "dataset",
  "ids": "ds1,ds2,ds3",
  "outputPath": "/tmp/domo-output"
}
```

**Response**:
```
Bulk Operation Summary:
Total: 3 IDs
Succeeded: 2
Failed: 1

Files Created:
- /tmp/domo-output/dataset-ds1.json (1.2 KB)
- /tmp/domo-output/dataset-ds3.json (2.3 KB)

Errors:
- ds2: Dataset not found
```
```

#### Update `CONTRIBUTING.md`

**Add section**: "Implementing Bulk Commands"

```markdown
## Implementing Bulk Commands

Bulk commands allow processing multiple entities in a single operation.

### Architecture

1. **BulkRequestExecutor**: Handles parallel processing with error handling
2. **BulkFileWriter**: Writes individual files + summary
3. **Command pattern**: Parse IDs → Execute → Write → Output summary

### Implementation Pattern

```typescript
export class BulkGetEntityCommand extends BaseCommand {
  async execute(args?: string[]): Promise<void> {
    // 1. Parse and validate
    const ids = CommandUtils.parseCommaSeparatedIds(args[0]);
    CommandUtils.validateBatchSize(ids);

    // 2. Execute bulk
    const results = await BulkRequestExecutor.executeBulk(
      ids,
      (id) => getEntity(id),
      { concurrency: 10 }
    );

    // 3. Write files
    const writeResult = await BulkFileWriter.writeBulkResults(
      results,
      "entity",
      domoConfig.outputPath
    );

    // 4. Output summary
    this.outputSummary(writeResult);
  }
}
```

### Testing Requirements

- Unit tests for command logic
- Test batch size validation
- Test error handling (continue on error)
- Test file output with sandboxing
- Integration tests with mock API

### Conventions

- Command name: `bulk-{original-command}`
- File naming: `{entity-type}-{id}.json`
- Summary file: `bulk-{entity-type}-summary.json`
- Max batch size: 500 IDs
- Concurrency limit: 10 parallel requests
```

---

### Phase 6: Code Review & Standards Enforcement

**Estimated Time**: 40 minutes
**Subagents**: code-reviewer → Paula → Alice (sequential)

#### Step 1: Code Review Agent

**Focus areas**:
- Code quality and patterns
- Security considerations (command injection, path traversal)
- Rate limiting implications
- Error handling completeness
- TypeScript strict mode compliance
- Potential memory issues with large batches

**Deliverable**: Code review report with findings

#### Step 2: Paula Standards Enforcement

**Standards checks**:
- ✅ File locations correct (`src/commands/`, `src/utils/`)
- ✅ Test co-location (`.test.ts` next to source)
- ✅ Naming conventions (kebab-case, PascalCase)
- ✅ TypeScript strict typing (no `any`)
- ✅ JSDoc comments on public methods
- ✅ Commit message format (Conventional Commits)
- ✅ Error handling patterns consistent
- ✅ No generated files modified

**Severity matrix**:
- 🔴 Critical: Must fix before merge
- 🟡 Warning: Should address
- 🟢 Minor: Nice to have

**Deliverable**: Standards audit report

#### Step 3: Alice Documentation Review

**Documentation checks**:
- ✅ Content quality and clarity
- ✅ Technical accuracy
- ✅ Dual-mode examples (interactive + scripting)
- ✅ JSON output format documented
- ✅ Error handling explained
- ✅ Authentication requirements clear
- ✅ Cross-references correct
- ✅ Command reference complete

**Deliverable**: Documentation quality report

---

## Implementation Sequence

```
Phase 0: Validation Spike (30 min)
   └─→ Prove architecture with single command
       └─→ Decision Gate: Proceed or revise?
           ↓
Phase 1: Core Infrastructure (90 min)
   └─→ BulkRequestExecutor + BulkFileWriter
       └─→ NEW: Rate limiting, timeouts, circuit breaker
           ↓
Phase 2: CLI Commands (90 min, parallelizable)
   └─→ 9 bulk command implementations
           ↓
Phase 3: MCP Integration (20 min)
   └─→ batch-get tool
           ↓
Phase 4: Testing (60 min)
   └─→ Unit + integration tests
       └─→ NEW: Rate limit, timeout, circuit breaker tests
           ↓
Phase 5: Documentation (40 min)
   └─→ CLI.md, MCP.md, CONTRIBUTING.md [Alice]
       └─→ NEW: Document rate limiting and timeout features
           ↓
Phase 6: Quality Assurance (40 min, sequential)
   ├─→ Code Review [code-reviewer agent]
   ├─→ Standards Enforcement [Paula]
   └─→ Documentation Quality [Alice]
```

**Timeline Summary**:
- Phase 0: 30 min
- Phase 1: 90 min
- Phase 2: 90 min (parallelizable across 9 commands)
- Phase 3: 20 min
- Phase 4: 60 min
- Phase 5: 40 min
- Phase 6: 40 min
- **Total**: ~370 minutes (6 hours 10 minutes, or ~5-6 hours with parallelization)

**Key Points**:
- **Phase 0 is critical**: Validates assumptions before scaling to 9 commands
- Phases 2-4 can use parallel subagents where appropriate (e.g., multiple commands)
- Phase 6 is sequential (code-review → Paula → Alice)
- Each phase builds on previous phases
- Testing happens continuously but formalized in Phase 4

---

## Technical Specifications

### Dependencies

**Check/Add to `package.json`**:
```json
{
  "dependencies": {
    "p-limit": "^3.1.0"  // For concurrency control
  }
}
```

### File Naming Conventions

| Entity Type | File Pattern | Example |
|-------------|--------------|---------|
| Dataset | `dataset-{id}.json` | `dataset-abc123.json` |
| Dataflow | `dataflow-{id}.json` | `dataflow-456.json` |
| Card | `card-{id}.json` | `card-789.json` |
| Card Image | `card-{id}-image.png` | `card-789-image.png` |
| Lineage Report | `dataflow-{id}-lineage-report.md` | `dataflow-456-lineage-report.md` |
| Summary | `bulk-{entity}-summary.json` | `bulk-dataset-summary.json` |

### Error Codes

| Code | Message | When | Retryable |
|------|---------|------|-----------|
| `BULK_BATCH_SIZE_EXCEEDED` | Batch size exceeds maximum of 500 IDs | More than 500 IDs provided | No |
| `BULK_OUTPUT_PATH_REQUIRED` | DOMO_OUTPUT_PATH must be set for bulk operations | Output path not configured | No |
| `BULK_PARTIAL_FAILURE` | Some items failed to process | One or more IDs failed | No |
| `BULK_INVALID_IDS` | No valid IDs provided | Empty or invalid ID list | No |
| **`RATE_LIMITED`** | API rate limit exceeded | HTTP 429 response received | **Yes** |
| **`REQUEST_TIMEOUT`** | Request timed out after X seconds | Individual request exceeded timeout | **Yes** |
| **`TOTAL_TIMEOUT_EXCEEDED`** | Batch operation exceeded maximum time limit | Entire batch exceeded total timeout | No |
| **`CIRCUIT_BREAKER_TRIPPED`** | Bulk operation aborted due to high failure rate | Failure rate > 50% after 20 requests | No |

### Concurrency & Timeout Configuration

```typescript
const DEFAULT_CONCURRENCY = 10;
const MAX_BATCH_SIZE = 500;
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;  // 30 seconds per request
const DEFAULT_TOTAL_TIMEOUT_MS = 600000;   // 10 minutes for entire batch
const DEFAULT_MAX_RETRIES = 3;

// All configurable via environment variables
const concurrency = parseInt(process.env.DOMO_BULK_CONCURRENCY || '10', 10);
const requestTimeout = parseInt(process.env.DOMO_BULK_REQUEST_TIMEOUT || '30000', 10);
const totalTimeout = parseInt(process.env.DOMO_BULK_TOTAL_TIMEOUT || '600000', 10);
const maxRetries = parseInt(process.env.DOMO_BULK_MAX_RETRIES || '3', 10);
```

**Environment Variables**:
- `DOMO_BULK_CONCURRENCY`: Number of parallel requests (default: 10)
- `DOMO_BULK_REQUEST_TIMEOUT`: Timeout per request in ms (default: 30000)
- `DOMO_BULK_TOTAL_TIMEOUT`: Total batch timeout in ms (default: 600000)
- `DOMO_BULK_MAX_RETRIES`: Max retries for failed requests (default: 3)

### Authentication Matrix

| Command | Auth Method | Required | Notes |
|---------|-------------|----------|-------|
| bulk-get-datasets | Any | Yes | API token, OAuth, or username/password |
| bulk-get-dataflows | API token | Yes | Requires `DOMO_API_TOKEN` |
| bulk-get-cards | Any | Yes | |
| bulk-render-cards | Any | Yes | |
| bulk-get-dataset-lineage | API token | Yes | Also requires `DOMO_API_HOST` |
| bulk-get-dataset-parents | API token | Yes | Also requires `DOMO_API_HOST` |
| bulk-get-dataset-children | API token | Yes | Also requires `DOMO_API_HOST` |
| bulk-get-dataflow-lineage | API token | Yes | Also requires `DOMO_API_HOST` |
| bulk-generate-lineage-reports | API token | Yes | Also requires `DOMO_API_HOST` |

---

## Success Criteria

### Functional Requirements
- ✅ All 9 bulk commands implemented and working
- ✅ Comma-separated ID parsing functional
- ✅ Parallel processing with concurrency limit (10)
- ✅ Continue-on-error behavior working
- ✅ Separate file output per entity
- ✅ Summary file generated with metadata
- ✅ DOMO_OUTPUT_PATH sandboxing enforced
- ✅ Batch size limit (500) enforced
- ✅ MCP `batch-get` tool working
- ✅ All tests passing

### Quality Requirements
- ✅ Code review passed (no critical issues)
- ✅ Paula standards audit passed (no critical violations)
- ✅ Alice documentation review passed
- ✅ TypeScript strict mode compliance
- ✅ Test coverage for all new code
- ✅ No security vulnerabilities
- ✅ Performance acceptable for 500 IDs

### Documentation Requirements
- ✅ CLI.md updated with bulk operations section
- ✅ MCP.md updated with batch-get tool
- ✅ CONTRIBUTING.md updated with implementation patterns
- ✅ All commands have usage examples
- ✅ JSON output formats documented
- ✅ Error handling behavior explained

---

## Risks & Mitigations

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Rate limiting with Domo API | High | ~~Implement concurrency limit (10), add retry logic~~ **✅ IMPLEMENTED: 429 detection, exponential backoff, max 3 retries** | ✅ Mitigated |
| Request timeouts | High | **✅ IMPLEMENTED: Per-request timeout (30s), total batch timeout (10min)** | ✅ Mitigated |
| API downtime/degradation | High | **✅ IMPLEMENTED: Circuit breaker (abort at 50% failure rate)** | ✅ Mitigated |
| Memory issues with large batches | Medium | Enforce 500 ID limit, stream results to files | ⚠️ Planned |
| Long execution time | Low | Expected for bulk operations, add progress reporting for interactive mode | ⚠️ Future |
| File system errors | Medium | Comprehensive error handling, validate paths early | ⚠️ Planned |
| Inconsistent error handling | Medium | Use BulkRequestExecutor for standardization | ⚠️ Planned |

---

## Future Enhancements

1. **Progress Reporting**: Add spinner or progress bar for interactive mode
2. ~~**Retry Logic**: Automatic retry for transient failures~~ **✅ IMPLEMENTED in Phase 1**
3. **Resume Capability**: Skip already-processed IDs from previous run
4. **Batch Chunking**: Auto-split large requests into multiple batches
5. ~~**Rate Limit Detection**: Detect 429 responses and back off automatically~~ **✅ IMPLEMENTED in Phase 1**
6. **Streaming**: Process and write results as they complete (don't wait for all)
7. **ID Input File**: Support `--ids-file=ids.txt` for very large batches
8. **Output Formats**: Support JSON array output for smaller batches
9. **Filtering**: Add `--filter` to apply filters during bulk fetch
10. **Compression**: Optional gzip compression for large result files

---

## Notes

- **Subagent Coordination**: Main Claude maintains context across all subagent invocations
- **Stateless Agents**: Paula and Alice start fresh each invocation, gather context via git
- **Sequential Quality Checks**: code-reviewer → Paula → Alice (not parallel)
- **Parallel Implementation**: Phase 2 commands can be implemented by multiple agents simultaneously
- **Testing First**: Unit tests created alongside implementation (not after)
- **Documentation Last**: Alice reviews docs only after all code complete

---

## Implementation Readiness

**Plan Status**: ✅ Ready for Implementation (Enhanced with operational hardening)
**Next Step**: Begin Phase 0 - Validation Spike

**Enhancements Applied** (based on Agent A/B code review):
- ✅ Added Phase 0 validation spike to de-risk architecture
- ✅ Implemented rate limit handling (429 detection, exponential backoff, retries)
- ✅ Implemented timeout configuration (per-request and total batch)
- ✅ Implemented circuit breaker for high failure scenarios
- ✅ Enhanced error contract with structured error details
- ✅ Updated timeline from 3-4 hours to 5-6 hours (realistic estimate)
