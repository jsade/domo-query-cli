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
