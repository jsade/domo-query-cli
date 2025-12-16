## [1.7.2](https://github.com/jsade/domo-query-cli/compare/v1.7.1...v1.7.2) (2025-12-16)


### Bug Fixes

* resolve pkg binary runtime error ([836d0fd](https://github.com/jsade/domo-query-cli/commit/836d0fdbcadd74977616f86a31eda8d42e118c29))

## [1.7.1](https://github.com/jsade/domo-query-cli/compare/v1.7.0...v1.7.1) (2025-12-16)


### Bug Fixes

* suppress dotenv verbose output and allow relative paths for export config ([ce5174c](https://github.com/jsade/domo-query-cli/commit/ce5174c10684b1334fa0bd5347f4ffa9cfabc149))

# [1.7.0](https://github.com/jsade/domo-query-cli/compare/v1.6.0...v1.7.0) (2025-12-09)


### Bug Fixes

* **deps:** downgrade inquirer to 9.3.7 for autocomplete compatibility ([d3b10cb](https://github.com/jsade/domo-query-cli/commit/d3b10cb1beba91767abb01c94442ade56028ac99))
* update Domo role and authority interfaces ([c99b94b](https://github.com/jsade/domo-query-cli/commit/c99b94bcea23a28e183803ce3bb378234d4bb0bb))


### Features

* **api:** add API functions for audit logs and roles management ([9e6ce29](https://github.com/jsade/domo-query-cli/commit/9e6ce2901853eb0dd2518337e55bcbdc433c539a))
* **api:** add type definitions and date utilities for audit logs and roles ([139d7e5](https://github.com/jsade/domo-query-cli/commit/139d7e5a8e35ef23edd107cf296377b62f79f486))
* **commands:** add 9 audit log and role management commands ([616f350](https://github.com/jsade/domo-query-cli/commit/616f350ce4c8f43373fe42a4fe9f7bcf25f35c52))

# [1.6.0](https://github.com/jsade/domo-query-cli/compare/v1.5.0...v1.6.0) (2025-12-08)

### Features

* **output:** unified output/export system infrastructure with consistent flag handling across all commands
* **output:** migrate 31 commands to unified output system (Phases B1-B6)
* **output:** add `--format=json`, `--export`, `--export=md`, `--export=both`, `--export-path`, `--output`, and `--quiet` flags
* **output:** legacy alias support (`--save`, `--save-json`, `--save-md`, `--save-both`, `--path`) for backward compatibility


### Bug Fixes

* **output:** fix `--format=json` silently ignoring `--save*` flags - both now work together
* **output:** fix `--export-path` not being properly passed to export functions


### Documentation

* **docs:** comprehensive CLI.md update with unified output system documentation
* **docs:** update README.md command table and output options section
* **docs:** update STORAGE.md with export flag precedence rules and examples

# [1.5.0](https://github.com/jsade/domo-query-cli/compare/v1.4.0...v1.5.0) (2025-10-30)


### Features

* Add group management commands and repository ([92dcad1](https://github.com/jsade/domo-query-cli/commit/92dcad179d77ea4b033ab7b4164f6e2603dc4698))
* add user management commands (list-users, get-user) ([5107c3f](https://github.com/jsade/domo-query-cli/commit/5107c3fde8ee3bccd0cf9a480be5660489f597cb))
* fix group API endpoints and add MCP user/group tools ([12fa60e](https://github.com/jsade/domo-query-cli/commit/12fa60efb30fd31fdde6b9feec10dde613c5091a))
* integrate user/group management with database sync and documentation ([df26438](https://github.com/jsade/domo-query-cli/commit/df2643853a586e9c420c116ebb15faddabf4f692))

# [1.4.0](https://github.com/jsade/domo-query-cli/compare/v1.3.0...v1.4.0) (2025-10-29)


### Features

* add dependabot.yml configuration for npm and GitHub Actions ([56617f5](https://github.com/jsade/domo-query-cli/commit/56617f5a1b06f65bffac7b189747b60a2b12aff8))

# [1.3.0](https://github.com/jsade/domo-query-cli/compare/v1.2.0...v1.3.0) (2025-10-26)


### Features

* **mcp:** add environment variables for database and log paths in MCP server setup ([a1eb16b](https://github.com/jsade/domo-query-cli/commit/a1eb16bbc31063bb536a7b9521813c5d796329f1))

# [1.2.0](https://github.com/jsade/domo-query-cli/compare/v1.1.2...v1.2.0) (2025-10-26)


### Bug Fixes

* **commands:** Added customizable rendering options and detailed status messages to RenderCardCommand [skip ci] ([3cb5807](https://github.com/jsade/domo-query-cli/commit/3cb580764f43d65b46f6fc0356364aa2d2239502))
* **commands:** improve formatting and readability in GetDatasetChildrenCommand and GetDatasetParentsCommand ([b1ae4e4](https://github.com/jsade/domo-query-cli/commit/b1ae4e43a233704dd421c78406315ad5a30befe8))
* **commands:** RenderCardCommand more self-sufficient and improve export path handling [skip ci] ([8ea4d76](https://github.com/jsade/domo-query-cli/commit/8ea4d76efc1e2c76a22536513aa75371fbc4f30d))


### Features

* **commands:** add GetDatasetChildrenCommand and GetDatasetParentsCommand for lineage queries ([00bc0c6](https://github.com/jsade/domo-query-cli/commit/00bc0c66a53b56a3e3d388812292a5a067abdacd))

## [1.1.2](https://github.com/jsade/domo-query-cli/compare/v1.1.1...v1.1.2) (2025-08-26)


### Bug Fixes

* **commands:** update default behavior for lineage traversal to true for both dataset and dataflow commands ([4bfac96](https://github.com/jsade/domo-query-cli/commit/4bfac960ce07e72f244169c096ee07fea309a6ff))

## [1.1.1](https://github.com/jsade/domo-query-cli/compare/v1.1.0...v1.1.1) (2025-08-26)


### Bug Fixes

* **mcp:** add get_dataflow_section tool , fix dataflow response handling, fix auth singleton issue ([1381a22](https://github.com/jsade/domo-query-cli/commit/1381a22fa253f40cc8e1dc1014b6a601d4c2719e))

# [1.1.0](https://github.com/jsade/domo-query-cli/compare/v1.0.0...v1.1.0) (2025-08-26)


### Bug Fixes

* adds commands for dataset and dataflow management in MCP Server ([ff50adf](https://github.com/jsade/domo-query-cli/commit/ff50adffc3e4a769ec2da468aea53a1b6bd4d6d4))
* **database:** Add DbRepairCommand for repairing corrupted database files and enhance JsonDatabase with recovery and backup features ([61ede2e](https://github.com/jsade/domo-query-cli/commit/61ede2ec30d99fb14b5755e7e9e555104c9c7723))
* getCard function to support new API endpoint and improve error handling ([6bc32b0](https://github.com/jsade/domo-query-cli/commit/6bc32b09f73ba90b81395f8b80c95ecb68bf85aa))
* **mcp:** Direct command execution now returns valid JSON without any preceding text ([8f23485](https://github.com/jsade/domo-query-cli/commit/8f2348562cb86d90c6cbfbb49e4e57cef409dac3))


### Features

* add get-dataflow-lineage command and API integration for lineage retrieval ([b8f96c4](https://github.com/jsade/domo-query-cli/commit/b8f96c481b7fe62e4f3e6758ecf71c7b903ca283))
* **database:** Implement JsonDatabase with CRUD operations and backup functionality ([dea85e1](https://github.com/jsade/domo-query-cli/commit/dea85e1faf3991ea252f694f013e348cbbeb1871))
* implement get-dataset-lineage command and API integration for lineage retrieval ([fcde28d](https://github.com/jsade/domo-query-cli/commit/fcde28dad9ec8499f224dd4881e57c67051bbcc3))
* Implement MCP Server for Domo Query CLI ([8ffe795](https://github.com/jsade/domo-query-cli/commit/8ffe795d40347943609cac769a13c11d454a3750))

# 1.0.0 (2025-06-25)


### Bug Fixes

* cleared major bugs and refactored code structure, and removed redundant changes ([f1103a9](https://github.com/jsade/domo-query-cli/commit/f1103a910db0beeb82572c5f82ac4063251f83a8))
* typo fix and minor version bump ([391935a](https://github.com/jsade/domo-query-cli/commit/391935adc555cb44d50b750a000702624da140b5))

# 1.0.0 (2025-06-25)


### Bug Fixes

* cleared major bugs and refactored code structure, and removed redundant changes ([f1103a9](https://github.com/jsade/domo-query-cli/commit/f1103a910db0beeb82572c5f82ac4063251f83a8))
