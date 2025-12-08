# [1.6.0](https://github.com/jsade/domo-query-cli/compare/v1.5.0...v1.6.0) (2025-12-08)


### Bug Fixes

* add CLI_LLM.md to .gitignore ([a9e6da5](https://github.com/jsade/domo-query-cli/commit/a9e6da582b425f46ff9f7cfa8c0b1b2b432f944e))
* **ci:** upgrade to Node 22 and remove redundant yarn package extensions ([c8add9e](https://github.com/jsade/domo-query-cli/commit/c8add9e83d11e907cfba530f40f5d326285d483e))
* enable positional command syntax in interactive terminals ([9c0c06c](https://github.com/jsade/domo-query-cli/commit/9c0c06cc93db4e1396baa00aecbca3d03cf23fb5))
* remove bulk request document ([023ae08](https://github.com/jsade/domo-query-cli/commit/023ae089c4942310fe327a1b60beee707ccc159d))
* update .gitignore to include local only files ([9bfaca0](https://github.com/jsade/domo-query-cli/commit/9bfaca0a5bb8ca2e441caab2f6b35d9db4f49152))


### Features

* add execute-datasource command for connector-based datasets ([fcff317](https://github.com/jsade/domo-query-cli/commit/fcff317d2e1c531e2c65243ca0d22dc0c12bcd77))
* add get-dataset-v3 command for v3 API endpoint ([d8a0f4c](https://github.com/jsade/domo-query-cli/commit/d8a0f4cbdef393d4e0af9b735152518aa6cf37f8))
* add output options for command results and implement JSON file writing functionality ([65bde79](https://github.com/jsade/domo-query-cli/commit/65bde79b11fa7e2651d4f82e96e0329f068416e5))
* add unified output/export system infrastructure (Phase A) ([e5666bd](https://github.com/jsade/domo-query-cli/commit/e5666bd191c04155855a71d2b72f90c8d7be9125))
* implement DOMO_OUTPUT_PATH for admin-controlled output sandboxing ([1378047](https://github.com/jsade/domo-query-cli/commit/137804731a25273d17c23fc9ebe64d2541e51306))
* migrate Wave B2 Get Entity commands to unified output system ([a66c80f](https://github.com/jsade/domo-query-cli/commit/a66c80f9ccece85f0285f22fa0a1f22c321b8e6c))
* migrate Wave B3 Lineage commands to unified output system ([f5bcc94](https://github.com/jsade/domo-query-cli/commit/f5bcc94340590c8735f8dae7d019ddddb35f808e))
* migrate Wave B4 Execute/Write commands to unified output system ([780c896](https://github.com/jsade/domo-query-cli/commit/780c8962eed94cd18c4a829ac8df5d8d4498d014))
* migrate Wave B5 Database commands to unified output system ([3a4f4d2](https://github.com/jsade/domo-query-cli/commit/3a4f4d237cd9366b0af2c9c08f6536a1153128d1))
* migrate Wave B6 Utility commands to unified output system ([dad18aa](https://github.com/jsade/domo-query-cli/commit/dad18aae04391648aaf8013c6f300e4cd56334cb))

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
