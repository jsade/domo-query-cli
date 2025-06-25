import { listDataflows } from "../api/clients/dataflowApi";
import { DataflowAuthMethod } from "../api/clients/dataflowClient";
import { DomoDataflow } from "../api/clients/domoClient";
import { DataLineageBuilder } from "../managers/DataLineageBuilder";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { promises as fs } from "fs";
import * as path from "path";
import chalk from "chalk";

/**
 * Statistics for lineage reports
 */
interface LineageStatistics {
    totalDataflows: number;
    totalDatasets: number;
    activeDataflows: number;
    failedDataflows: number;
    orphanedDatasets: number;
    avgInputsPerDataflow: number;
    avgOutputsPerDataflow: number;
    topOwners?: Array<{ owner: string; count: number; successRate?: number }>;
}

/**
 * Generates comprehensive lineage reports in Obsidian-compatible markdown format
 */
export class GenerateLineageReportCommand extends BaseCommand {
    public readonly name = "generate-lineage-report";
    public readonly description =
        "Generates comprehensive lineage reports in Obsidian-compatible markdown format";

    /**
     * Executes the generate-lineage-report command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const [entityId, ...options] = args || [];

            // Parse options
            const { reportType, outputPath, includeOptions } =
                this.parseOptions(options);

            console.log("\nDomo Data Lineage Report Generator");
            console.log("=====================================");

            // Always use apiToken auth method for dataflow operations
            const authMethod: DataflowAuthMethod = "apiToken";

            // Fetch all dataflows
            console.log("\nLoading dataflows...");
            const dataflows = await listDataflows({ limit: 1000 }, authMethod);

            if (dataflows.length === 0) {
                console.log(
                    "No dataflows found. Unable to generate lineage report.",
                );
                return;
            }

            console.log(`Found ${dataflows.length} dataflows`);

            // Build the lineage graph
            console.log("\nBuilding lineage graph...");
            const builder = new DataLineageBuilder();
            const graph = builder.buildLineageGraph(dataflows);

            console.log(
                `Graph built with ${graph.nodes.size} nodes and ${graph.edges.length} edges`,
            );

            // Generate report based on type
            let report: string;
            let filename: string;

            switch (reportType) {
                case "entity":
                    if (!entityId) {
                        console.log("\nEntity ID required for entity report");
                        console.log(
                            "Usage: generate-lineage-report <entity-id> --type=entity",
                        );
                        return;
                    }
                    report = await this.generateEntityReport(
                        entityId,
                        builder,
                        dataflows,
                        includeOptions,
                    );
                    filename = `lineage-report-${entityId}.md`;
                    break;

                case "overview":
                    report = await this.generateOverviewReport(
                        builder,
                        dataflows,
                        includeOptions,
                    );
                    filename = "lineage-overview-report.md";
                    break;

                case "orphans":
                    report = await this.generateOrphansReport(
                        builder,
                        dataflows,
                    );
                    filename = "lineage-orphans-report.md";
                    break;

                case "full":
                default:
                    report = await this.generateFullReport(
                        builder,
                        dataflows,
                        includeOptions,
                    );
                    filename = "lineage-full-report.md";
                    break;
            }

            // Write report to file
            const reportPath = path.join(outputPath, filename);
            await fs.mkdir(outputPath, { recursive: true });
            await fs.writeFile(reportPath, report, "utf8");

            console.log(`\nReport generated successfully!`);
            console.log(`Location: ${reportPath}`);
            console.log(
                `\nTip: Open this file in Obsidian for best viewing experience`,
            );
        } catch (error) {
            log.error("Error generating lineage report:", error);
            console.error(
                "\nFailed to generate lineage report. Check your authentication and try again.",
            );
        }
    }

    /**
     * Shows help for the generate-lineage-report command
     */
    public showHelp(): void {
        console.log(
            "Generates comprehensive lineage reports in Obsidian-compatible markdown format",
        );
        console.log("Usage: generate-lineage-report [entity-id] [options]");
        console.log(chalk.cyan("\nReport Types:"));
        console.log(
            "  --type=full            Generate full lineage report (default)",
        );
        console.log(
            "  --type=entity          Generate report for specific entity (requires entity-id)",
        );
        console.log(
            "  --type=overview        Generate overview report with statistics",
        );
        console.log(
            "  --type=orphans         Generate report of orphaned datasets and broken links",
        );
        console.log(chalk.cyan("\nOptions:"));
        console.log(
            "  --path=<directory>     Output directory (default: ./reports)",
        );
        console.log("  --include-diagrams     Include Mermaid diagrams");
        console.log("  --include-metadata     Include detailed metadata");
        console.log("  --include-transforms   Include transformation details");
        console.log(
            "  --max-depth=<n>        Maximum depth for diagrams (default: 3)",
        );
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  generate-lineage-report                         Generate full report",
        );
        console.log(
            "  generate-lineage-report ds123 --type=entity     Generate report for dataset",
        );
        console.log(
            "  generate-lineage-report --type=overview         Generate overview report",
        );
        console.log("");
    }

    private parseOptions(options: string[]): {
        reportType: string;
        outputPath: string;
        includeOptions: {
            diagrams: boolean;
            metadata: boolean;
            transforms: boolean;
            maxDepth: number;
        };
    } {
        let reportType = "full";
        let outputPath = "./reports";
        const includeOptions = {
            diagrams: false,
            metadata: false,
            transforms: false,
            maxDepth: 3,
        };

        for (const opt of options) {
            if (opt.startsWith("--type=")) {
                reportType = opt.split("=")[1];
            } else if (opt.startsWith("--path=")) {
                outputPath = opt.split("=")[1];
            } else if (opt === "--include-diagrams") {
                includeOptions.diagrams = true;
            } else if (opt === "--include-metadata") {
                includeOptions.metadata = true;
            } else if (opt === "--include-transforms") {
                includeOptions.transforms = true;
            } else if (opt.startsWith("--max-depth=")) {
                const depth = parseInt(opt.split("=")[1], 10);
                includeOptions.maxDepth = isNaN(depth)
                    ? 3
                    : Math.max(1, Math.min(10, depth));
            }
        }

        return { reportType, outputPath, includeOptions };
    }

    private async generateFullReport(
        builder: DataLineageBuilder,
        dataflows: DomoDataflow[],
        includeOptions: {
            diagrams: boolean;
            metadata: boolean;
            transforms: boolean;
            maxDepth: number;
        },
    ): Promise<string> {
        const report: string[] = [];
        const timestamp = new Date().toISOString();

        // Header
        report.push("# Domo Data Lineage Full Report");
        report.push("");
        report.push(`> Generated: ${timestamp}`);
        report.push("");

        // Table of Contents
        report.push("## Table of Contents");
        report.push("");
        report.push("- [[#Overview|Overview]]");
        report.push("- [[#Statistics|Statistics]]");
        report.push("- [[#Dataflows|Dataflows]]");
        report.push("- [[#Datasets|Datasets]]");
        report.push("- [[#Lineage Graph|Lineage Graph]]");
        report.push("- [[#Issues|Issues]]");
        report.push("");

        // Overview
        report.push("## Overview");
        report.push("");
        report.push(
            "This report provides a comprehensive view of your Domo data lineage, including:",
        );
        report.push("- All dataflows and their connections");
        report.push("- Dataset dependencies and relationships");
        report.push("- Data flow visualization");
        report.push("- Potential issues and orphaned datasets");
        report.push("");

        // Statistics
        const stats = this.calculateStatistics(builder, dataflows);
        report.push("## Statistics");
        report.push("");
        report.push("| Metric | Value |");
        report.push("|--------|-------|");
        report.push(`| Total Dataflows | ${stats.totalDataflows} |`);
        report.push(`| Total Datasets | ${stats.totalDatasets} |`);
        report.push(`| Active Dataflows | ${stats.activeDataflows} |`);
        report.push(`| Failed Dataflows | ${stats.failedDataflows} |`);
        report.push(`| Orphaned Datasets | ${stats.orphanedDatasets} |`);
        report.push(
            `| Average Inputs per Dataflow | ${stats.avgInputsPerDataflow.toFixed(2)} |`,
        );
        report.push(
            `| Average Outputs per Dataflow | ${stats.avgOutputsPerDataflow.toFixed(2)} |`,
        );
        report.push("");

        // Dataflows Section
        report.push("## Dataflows");
        report.push("");

        const groupedDataflows = this.groupDataflowsByStatus(dataflows);

        // Debug: Log a sample dataflow to see what fields are available
        if (dataflows.length > 0) {
            const sample = dataflows[0];
            console.log("\nDebug - Sample dataflow fields:");
            console.log(
                `- lastExecution: ${sample.lastExecution ? JSON.stringify(sample.lastExecution) : "undefined"}`,
            );
            console.log(`- status: ${sample.status}`);
            console.log(`- runState: ${sample.runState}`);
            console.log(`- enabled: ${sample.enabled}`);
            console.log(
                `- lastSuccessfulExecution: ${sample.lastSuccessfulExecution}`,
            );
            console.log(
                `- executionSuccessCount: ${sample.executionSuccessCount}`,
            );
        }

        for (const [status, flows] of Object.entries(groupedDataflows)) {
            if (flows.length === 0) continue;

            report.push(
                `### ${this.getStatusEmoji(status)} ${status} (${flows.length})`,
            );
            report.push("");

            for (const df of flows) {
                report.push(`#### [[${df.name}]]`);
                report.push("");
                report.push(`- **ID**: \`${df.id}\``);
                report.push(`- **Type**: ${df.dataFlowType || "Standard"}`);
                report.push(
                    `- **Owner**: ${df.owners?.[0]?.displayName || "Unknown"}`,
                );
                report.push(
                    `- **Last Modified**: ${df.lastUpdated ? new Date(df.lastUpdated).toLocaleString() : "Unknown"}`,
                );

                if (includeOptions.metadata) {
                    report.push(`- **Success Rate**: ${df.successRate || 0}%`);
                    report.push(`- **Run Count**: ${df.runCount || 0}`);
                    report.push(
                        `- **Compute Cloud**: ${df.computeCloud || "N/A"}`,
                    );
                }

                // Inputs and Outputs
                if (df.inputs && df.inputs.length > 0) {
                    report.push("");
                    report.push("**Inputs:**");
                    df.inputs.forEach(input => {
                        report.push(
                            `- [[${input.name}]] (\`${input.dataSourceId}\`)`,
                        );
                    });
                }

                if (df.outputs && df.outputs.length > 0) {
                    report.push("");
                    report.push("**Outputs:**");
                    df.outputs.forEach(output => {
                        report.push(
                            `- [[${output.name}]] (\`${output.dataSourceId}\`)`,
                        );
                    });
                }

                if (includeOptions.diagrams) {
                    report.push("");
                    report.push("```mermaid");
                    report.push(this.generateDataflowDiagram(df));
                    report.push("```");
                }

                report.push("");
                report.push("---");
                report.push("");
            }
        }

        // Datasets Section
        report.push("## Datasets");
        report.push("");

        const graph = builder.exportForVisualization();
        const datasets = Array.from(graph.nodes.values())
            .filter(node => node.type === "dataset")
            .sort((a, b) => a.name.localeCompare(b.name));

        report.push(`Total datasets in lineage: ${datasets.length}`);
        report.push("");

        // Group datasets by usage
        const orphanedDatasets: Array<{ id: string; name: string }> = [];
        const sourceDatasets: Array<{ id: string; name: string }> = [];
        const intermediateDatasets: Array<{ id: string; name: string }> = [];
        const sinkDatasets: Array<{ id: string; name: string }> = [];

        for (const dataset of datasets) {
            const dependencies = builder.getDatasetDependencies(dataset.id);
            if (!dependencies) {
                orphanedDatasets.push(dataset);
            } else if (
                dependencies.upstream.dataflows.length === 0 &&
                dependencies.downstream.dataflows.length > 0
            ) {
                sourceDatasets.push(dataset);
            } else if (
                dependencies.upstream.dataflows.length > 0 &&
                dependencies.downstream.dataflows.length === 0
            ) {
                sinkDatasets.push(dataset);
            } else if (
                dependencies.upstream.dataflows.length > 0 &&
                dependencies.downstream.dataflows.length > 0
            ) {
                intermediateDatasets.push(dataset);
            } else {
                orphanedDatasets.push(dataset);
            }
        }

        if (sourceDatasets.length > 0) {
            report.push("### 📥 Source Datasets");
            report.push("");
            report.push(
                "Datasets that are only used as inputs (no dataflows output to them):",
            );
            report.push("");
            sourceDatasets.forEach(ds => {
                report.push(`- [[${ds.name}]] (\`${ds.id}\`)`);
            });
            report.push("");
        }

        if (intermediateDatasets.length > 0) {
            report.push("### Intermediate Datasets");
            report.push("");
            report.push(
                "Datasets that are both inputs and outputs of dataflows:",
            );
            report.push("");
            intermediateDatasets.forEach(ds => {
                report.push(`- [[${ds.name}]] (\`${ds.id}\`)`);
            });
            report.push("");
        }

        if (sinkDatasets.length > 0) {
            report.push("### 📤 Sink Datasets");
            report.push("");
            report.push(
                "Datasets that are only outputs (no dataflows use them as input):",
            );
            report.push("");
            sinkDatasets.forEach(ds => {
                report.push(`- [[${ds.name}]] (\`${ds.id}\`)`);
            });
            report.push("");
        }

        // Lineage Graph
        if (includeOptions.diagrams) {
            report.push("## Lineage Graph");
            report.push("");
            report.push("Full data lineage visualization:");
            report.push("");
            report.push("```mermaid");
            const mermaidDiagram = this.generateFullLineageDiagram(builder);
            report.push(mermaidDiagram);
            report.push("```");
            report.push("");
        }

        // Issues Section
        report.push("## Issues");
        report.push("");

        if (orphanedDatasets.length > 0) {
            report.push(`### Orphaned Datasets (${orphanedDatasets.length})`);
            report.push("");
            report.push("Datasets with no connections to any dataflow:");
            report.push("");
            orphanedDatasets.forEach(ds => {
                report.push(`- [[${ds.name}]] (\`${ds.id}\`)`);
            });
            report.push("");
        }

        const failedDataflows = dataflows.filter(
            df => df.lastExecution?.state === "FAILED",
        );
        if (failedDataflows.length > 0) {
            report.push(`### Failed Dataflows (${failedDataflows.length})`);
            report.push("");
            failedDataflows.forEach(df => {
                report.push(
                    `- [[${df.name}]] (\`${df.id}\`) - Last failed: ${df.lastExecution?.endTime ? new Date(df.lastExecution.endTime).toLocaleString() : "Unknown"}`,
                );
            });
            report.push("");
        }

        // Footer
        report.push("---");
        report.push("");
        report.push("## Notes");
        report.push("");
        report.push(
            "This report was generated automatically. For the most up-to-date information, please regenerate the report.",
        );
        report.push("");
        report.push("### Tags");
        report.push("#domo #datalineage #report #automated");

        return report.join("\n");
    }

    private async generateEntityReport(
        entityId: string,
        builder: DataLineageBuilder,
        dataflows: DomoDataflow[],
        includeOptions: {
            diagrams: boolean;
            metadata: boolean;
            transforms: boolean;
            maxDepth: number;
        },
    ): Promise<string> {
        const report: string[] = [];
        const graph = builder.exportForVisualization();
        const node = graph.nodes.find(n => n.id === entityId);

        if (!node) {
            report.push(`# Entity Not Found`);
            report.push("");
            report.push(
                `Entity with ID \`${entityId}\` was not found in the lineage graph.`,
            );
            return report.join("\n");
        }

        // Header
        report.push(`# ${node.name}`);
        report.push("");
        report.push(`> Entity Type: ${node.type}`);
        report.push(`> Entity ID: \`${entityId}\``);
        report.push(`> Generated: ${new Date().toISOString()}`);
        report.push("");

        // Metadata
        if (node.metadata && includeOptions.metadata) {
            report.push("## Metadata");
            report.push("");
            report.push("| Property | Value |");
            report.push("|----------|-------|");
            if (node.metadata.status)
                report.push(`| Status | ${node.metadata.status} |`);
            if (node.metadata.owner)
                report.push(`| Owner | ${node.metadata.owner} |`);
            if (node.metadata.lastUpdated)
                report.push(`| Last Updated | ${node.metadata.lastUpdated} |`);
            if (node.metadata.successRate !== undefined)
                report.push(`| Success Rate | ${node.metadata.successRate}% |`);
            report.push("");
        }

        // Dependencies
        if (node.type === "dataset") {
            const dependencies = builder.getDatasetDependencies(entityId);
            if (dependencies) {
                report.push("## 🔗 Dependencies");
                report.push("");

                // Upstream
                report.push("### ⬆️ Upstream");
                report.push("");
                if (dependencies.upstream.dataflows.length > 0) {
                    report.push("**Dataflows that output to this dataset:**");
                    report.push("");
                    dependencies.upstream.dataflows.forEach(df => {
                        report.push(`- [[${df.name}]] (\`${df.id}\`)`);
                        if (df.status) report.push(`  - Status: ${df.status}`);
                        if (df.owner) report.push(`  - Owner: ${df.owner}`);
                    });
                    report.push("");
                }

                if (dependencies.upstream.datasets.length > 0) {
                    report.push("**Source datasets:**");
                    report.push("");
                    dependencies.upstream.datasets.forEach(ds => {
                        report.push(`- [[${ds.name}]] (\`${ds.id}\`)`);
                    });
                    report.push("");
                }

                // Downstream
                report.push("### ⬇️ Downstream");
                report.push("");
                if (dependencies.downstream.dataflows.length > 0) {
                    report.push(
                        "**Dataflows that use this dataset as input:**",
                    );
                    report.push("");
                    dependencies.downstream.dataflows.forEach(df => {
                        report.push(`- [[${df.name}]] (\`${df.id}\`)`);
                        if (df.status) report.push(`  - Status: ${df.status}`);
                        if (df.owner) report.push(`  - Owner: ${df.owner}`);
                    });
                    report.push("");
                }

                if (dependencies.downstream.datasets.length > 0) {
                    report.push("**Output datasets:**");
                    report.push("");
                    dependencies.downstream.datasets.forEach(ds => {
                        report.push(`- [[${ds.name}]] (\`${ds.id}\`)`);
                    });
                    report.push("");
                }
            }
        } else {
            // Dataflow connections
            const dataflow = dataflows.find(df => df.id === entityId);
            if (dataflow) {
                report.push("## 🔗 Connections");
                report.push("");

                if (dataflow.inputs && dataflow.inputs.length > 0) {
                    report.push("### 📥 Input Datasets");
                    report.push("");
                    dataflow.inputs.forEach(input => {
                        report.push(
                            `- [[${input.name}]] (\`${input.dataSourceId}\`)`,
                        );
                    });
                    report.push("");
                }

                if (dataflow.outputs && dataflow.outputs.length > 0) {
                    report.push("### 📤 Output Datasets");
                    report.push("");
                    dataflow.outputs.forEach(output => {
                        report.push(
                            `- [[${output.name}]] (\`${output.dataSourceId}\`)`,
                        );
                    });
                    report.push("");
                }

                if (includeOptions.transforms && dataflow.actions) {
                    report.push("## Transformations");
                    report.push("");
                    report.push("```json");
                    report.push(JSON.stringify(dataflow.actions, null, 2));
                    report.push("```");
                    report.push("");
                }
            }
        }

        // Lineage Diagram
        if (includeOptions.diagrams) {
            report.push("## Lineage Diagram");
            report.push("");
            report.push("```mermaid");
            report.push(
                this.generateFocusedDiagram(
                    builder,
                    entityId,
                    includeOptions.maxDepth,
                ),
            );
            report.push("```");
            report.push("");
        }

        // Tags
        report.push("---");
        report.push("");
        report.push("### Tags");
        report.push(`#domo #${node.type} #lineage`);

        return report.join("\n");
    }

    private async generateOverviewReport(
        builder: DataLineageBuilder,
        dataflows: DomoDataflow[],
        includeOptions: {
            diagrams: boolean;
            metadata: boolean;
            transforms: boolean;
            maxDepth: number;
        },
    ): Promise<string> {
        const report: string[] = [];
        const stats = this.calculateStatistics(builder, dataflows);

        // Header
        report.push("# Domo Data Lineage Overview");
        report.push("");
        report.push(`> Generated: ${new Date().toISOString()}`);
        report.push("");

        // Executive Summary
        report.push("## Executive Summary");
        report.push("");
        report.push(
            `Your Domo instance contains **${stats.totalDataflows} dataflows** managing **${stats.totalDatasets} datasets**.`,
        );
        report.push("");

        const healthScore = this.calculateHealthScore(stats);
        report.push(`### 🏥 Data Pipeline Health Score: ${healthScore}/100`);
        report.push("");

        if (healthScore >= 80) {
            report.push(
                "**Excellent** - Your data pipelines are in great shape!",
            );
        } else if (healthScore >= 60) {
            report.push("**Good** - Some improvements could be made.");
        } else if (healthScore >= 40) {
            report.push("**Fair** - Several issues need attention.");
        } else {
            report.push(
                "**Poor** - Significant issues require immediate attention.",
            );
        }
        report.push("");

        // Key Metrics
        report.push("## Key Metrics");
        report.push("");
        report.push("| Category | Metric | Value | Status |");
        report.push("|----------|--------|-------|--------|");
        report.push(`| **Dataflows** | Total | ${stats.totalDataflows} | - |`);
        report.push(
            `| | Active | ${stats.activeDataflows} | ${this.getStatusIndicator(stats.activeDataflows / stats.totalDataflows)} |`,
        );
        report.push(
            `| | Failed | ${stats.failedDataflows} | ${this.getStatusIndicator(1 - stats.failedDataflows / stats.totalDataflows)} |`,
        );
        report.push(
            `| | Success Rate | ${((stats.activeDataflows / stats.totalDataflows) * 100).toFixed(1)}% | ${this.getStatusIndicator(stats.activeDataflows / stats.totalDataflows)} |`,
        );
        report.push(`| **Datasets** | Total | ${stats.totalDatasets} | - |`);
        report.push(
            `| | Orphaned | ${stats.orphanedDatasets} | ${this.getStatusIndicator(1 - stats.orphanedDatasets / stats.totalDatasets)} |`,
        );
        report.push(
            `| | Utilization | ${((1 - stats.orphanedDatasets / stats.totalDatasets) * 100).toFixed(1)}% | ${this.getStatusIndicator(1 - stats.orphanedDatasets / stats.totalDatasets)} |`,
        );
        report.push(
            `| **Complexity** | Avg Inputs | ${stats.avgInputsPerDataflow.toFixed(2)} | - |`,
        );
        report.push(
            `| | Avg Outputs | ${stats.avgOutputsPerDataflow.toFixed(2)} | - |`,
        );
        report.push("");

        // Top Contributors
        const topOwners = this.getTopOwners(dataflows);
        if (topOwners.length > 0) {
            report.push("## 👥 Top Contributors");
            report.push("");
            report.push("| Owner | Dataflows | Success Rate |");
            report.push("|-------|-----------|--------------|");
            topOwners.slice(0, 10).forEach(owner => {
                report.push(
                    `| ${owner.name} | ${owner.count} | ${owner.successRate.toFixed(1)}% |`,
                );
            });
            report.push("");
        }

        // Dataflow Types
        const dataflowTypes = this.getDataflowTypes(dataflows);
        report.push("## 🏷️ Dataflow Types");
        report.push("");
        report.push("| Type | Count | Percentage |");
        report.push("|------|-------|------------|");
        dataflowTypes.forEach(type => {
            report.push(
                `| ${type.type || "Standard"} | ${type.count} | ${((type.count / stats.totalDataflows) * 100).toFixed(1)}% |`,
            );
        });
        report.push("");

        // Recommendations
        report.push("## Recommendations");
        report.push("");

        const recommendations = this.generateRecommendations(stats);
        recommendations.forEach((rec, index) => {
            report.push(`${index + 1}. ${rec}`);
        });
        report.push("");

        // Visual Summary
        if (includeOptions.diagrams) {
            report.push("## Visual Summary");
            report.push("");
            report.push("### Data Flow Complexity");
            report.push("");
            report.push("```mermaid");
            report.push("pie title Dataflow Status Distribution");
            report.push(`    "Active" : ${stats.activeDataflows}`);
            report.push(`    "Failed" : ${stats.failedDataflows}`);
            report.push(
                `    "Other" : ${stats.totalDataflows - stats.activeDataflows - stats.failedDataflows}`,
            );
            report.push("```");
            report.push("");
        }

        // Tags
        report.push("---");
        report.push("");
        report.push("### Tags");
        report.push("#domo #datalineage #overview #metrics");

        return report.join("\n");
    }

    private async generateOrphansReport(
        builder: DataLineageBuilder,
        dataflows: DomoDataflow[],
    ): Promise<string> {
        const report: string[] = [];
        const graph = builder.exportForVisualization();

        // Header
        report.push("# 🔍 Orphaned Datasets and Broken Links Report");
        report.push("");
        report.push(`> Generated: ${new Date().toISOString()}`);
        report.push("");

        // Find orphaned datasets
        const orphanedDatasets: Array<{ id: string; name: string }> = [];
        const datasets = Array.from(graph.nodes.values()).filter(
            node => node.type === "dataset",
        );

        for (const dataset of datasets) {
            const hasConnections = graph.links.some(
                link =>
                    link.source === dataset.id || link.target === dataset.id,
            );
            if (!hasConnections) {
                orphanedDatasets.push(dataset);
            }
        }

        // Summary
        report.push("## Summary");
        report.push("");
        report.push(`- **Total Datasets**: ${datasets.length}`);
        report.push(`- **Orphaned Datasets**: ${orphanedDatasets.length}`);
        report.push(
            `- **Orphan Rate**: ${((orphanedDatasets.length / datasets.length) * 100).toFixed(1)}%`,
        );
        report.push("");

        // Orphaned Datasets
        if (orphanedDatasets.length > 0) {
            report.push("## Orphaned Datasets");
            report.push("");
            report.push("These datasets have no connections to any dataflow:");
            report.push("");

            orphanedDatasets.sort((a, b) => a.name.localeCompare(b.name));
            orphanedDatasets.forEach(ds => {
                report.push(`### [[${ds.name}]]`);
                report.push(`- **ID**: \`${ds.id}\``);
                report.push("");
            });
        } else {
            report.push("## No Orphaned Datasets Found");
            report.push("");
            report.push("All datasets are connected to at least one dataflow.");
        }

        // Failed Dataflows
        const failedDataflows = dataflows.filter(
            df => df.lastExecution?.state === "FAILED",
        );
        if (failedDataflows.length > 0) {
            report.push("## Failed Dataflows");
            report.push("");
            report.push("These dataflows have failed in their last execution:");
            report.push("");

            failedDataflows.forEach(df => {
                report.push(`### [[${df.name}]]`);
                report.push(`- **ID**: \`${df.id}\``);
                report.push(
                    `- **Last Failed**: ${df.lastExecution?.endTime ? new Date(df.lastExecution.endTime).toLocaleString() : "Unknown"}`,
                );
                // Note: DomoDataflowExecution doesn't have a message field
                report.push("");
            });
        }

        // Recommendations
        report.push("## Cleanup Recommendations");
        report.push("");
        report.push(
            "1. **Review Orphaned Datasets**: Check if these datasets are still needed",
        );
        report.push(
            "2. **Archive Unused Data**: Consider archiving datasets that haven't been updated recently",
        );
        report.push(
            "3. **Fix Failed Dataflows**: Investigate and resolve dataflow failures",
        );
        report.push(
            "4. **Document Dependencies**: Ensure all critical datasets have documented ownership",
        );
        report.push("");

        // Tags
        report.push("---");
        report.push("");
        report.push("### Tags");
        report.push("#domo #datalineage #orphans #cleanup");

        return report.join("\n");
    }

    private calculateStatistics(
        builder: DataLineageBuilder,
        dataflows: DomoDataflow[],
    ): LineageStatistics {
        const graph = builder.exportForVisualization();
        const datasets = Array.from(graph.nodes.values()).filter(
            node => node.type === "dataset",
        );

        let totalInputs = 0;
        let totalOutputs = 0;
        let activeDataflows = 0;
        let failedDataflows = 0;

        dataflows.forEach(df => {
            totalInputs += df.inputs?.length || 0;
            totalOutputs += df.outputs?.length || 0;

            // Use the same logic as groupDataflowsByStatus
            if (df.lastExecution?.state === "SUCCESS") {
                activeDataflows++;
            } else if (df.lastExecution?.state === "FAILED") {
                failedDataflows++;
            }
            // Fall back to status field
            else if (
                df.status?.toUpperCase() === "ACTIVE" ||
                df.status?.toUpperCase() === "SUCCESS"
            ) {
                activeDataflows++;
            } else if (df.status?.toUpperCase() === "FAILED") {
                failedDataflows++;
            }
            // Fall back to runState field or enabled flag
            else if (
                df.runState?.toUpperCase() === "ENABLED" ||
                df.enabled === true
            ) {
                activeDataflows++;
            }
            // If we have successful executions, consider it active
            else if (
                df.lastSuccessfulExecution ||
                (df.executionSuccessCount && df.executionSuccessCount > 0)
            ) {
                activeDataflows++;
            } else {
                // Count as active by default if we have no status info
                activeDataflows++;
            }
        });

        // Find orphaned datasets
        let orphanedDatasets = 0;
        datasets.forEach(dataset => {
            const hasConnections = graph.links.some(
                link =>
                    link.source === dataset.id || link.target === dataset.id,
            );
            if (!hasConnections) {
                orphanedDatasets++;
            }
        });

        return {
            totalDataflows: dataflows.length,
            totalDatasets: datasets.length,
            activeDataflows,
            failedDataflows,
            orphanedDatasets,
            avgInputsPerDataflow:
                dataflows.length > 0 ? totalInputs / dataflows.length : 0,
            avgOutputsPerDataflow:
                dataflows.length > 0 ? totalOutputs / dataflows.length : 0,
        };
    }

    private calculateHealthScore(stats: LineageStatistics): number {
        let score = 100;

        // Deduct points for failed dataflows
        if (stats.totalDataflows > 0) {
            const failureRate = stats.failedDataflows / stats.totalDataflows;
            score -= failureRate * 30; // Up to 30 points for failures
        }

        // Deduct points for orphaned datasets
        if (stats.totalDatasets > 0) {
            const orphanRate = stats.orphanedDatasets / stats.totalDatasets;
            score -= orphanRate * 20; // Up to 20 points for orphans
        }

        // Deduct points for very complex dataflows
        if (stats.avgInputsPerDataflow > 10) {
            score -= 10;
        }

        return Math.max(0, Math.round(score));
    }

    private getStatusIndicator(ratio: number): string {
        if (ratio >= 0.9) return "GOOD";
        if (ratio >= 0.7) return "OK";
        if (ratio >= 0.5) return "WARN";
        return "FAIL";
    }

    private getStatusEmoji(status: string): string {
        switch (status.toUpperCase()) {
            case "SUCCESS":
            case "ACTIVE":
                return "SUCCESS";
            case "FAILED":
                return "FAILED";
            case "RUNNING":
                return "RUNNING";
            default:
                return "UNKNOWN";
        }
    }

    private groupDataflowsByStatus(
        dataflows: DomoDataflow[],
    ): Record<string, DomoDataflow[]> {
        const grouped: Record<string, DomoDataflow[]> = {
            Active: [],
            Failed: [],
            Running: [],
            Unknown: [],
        };

        dataflows.forEach(df => {
            // Check lastExecution state first
            if (df.lastExecution?.state === "SUCCESS") {
                grouped["Active"].push(df);
            } else if (df.lastExecution?.state === "FAILED") {
                grouped["Failed"].push(df);
            } else if (df.lastExecution?.state === "RUNNING") {
                grouped["Running"].push(df);
            }
            // Fall back to status field
            else if (
                df.status?.toUpperCase() === "ACTIVE" ||
                df.status?.toUpperCase() === "SUCCESS"
            ) {
                grouped["Active"].push(df);
            } else if (df.status?.toUpperCase() === "FAILED") {
                grouped["Failed"].push(df);
            } else if (df.status?.toUpperCase() === "RUNNING") {
                grouped["Running"].push(df);
            }
            // Fall back to runState field
            else if (
                df.runState?.toUpperCase() === "ENABLED" ||
                df.enabled === true
            ) {
                grouped["Active"].push(df);
            } else if (
                df.runState?.toUpperCase() === "DISABLED" ||
                df.enabled === false
            ) {
                grouped["Unknown"].push(df);
            }
            // If we have successful executions, consider it active
            else if (
                df.lastSuccessfulExecution ||
                (df.executionSuccessCount && df.executionSuccessCount > 0)
            ) {
                grouped["Active"].push(df);
            } else {
                grouped["Unknown"].push(df);
            }
        });

        return grouped;
    }

    private getTopOwners(
        dataflows: DomoDataflow[],
    ): Array<{ name: string; count: number; successRate: number }> {
        const ownerMap = new Map<
            string,
            { count: number; successCount: number }
        >();

        dataflows.forEach(df => {
            const ownerName = df.owners?.[0]?.displayName || "Unknown";
            const current = ownerMap.get(ownerName) || {
                count: 0,
                successCount: 0,
            };
            current.count++;
            if (df.lastExecution?.state === "SUCCESS") {
                current.successCount++;
            }
            ownerMap.set(ownerName, current);
        });

        return Array.from(ownerMap.entries())
            .map(([name, data]) => ({
                name,
                count: data.count,
                successRate:
                    data.count > 0 ? (data.successCount / data.count) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count);
    }

    private getDataflowTypes(
        dataflows: DomoDataflow[],
    ): Array<{ type: string; count: number }> {
        const typeMap = new Map<string, number>();

        dataflows.forEach(df => {
            const type = df.dataFlowType || "Standard";
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });

        return Array.from(typeMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }

    private generateRecommendations(stats: LineageStatistics): string[] {
        const recommendations: string[] = [];

        if (stats.failedDataflows > stats.totalDataflows * 0.1) {
            recommendations.push(
                "**High Priority**: Address failed dataflows - more than 10% are failing",
            );
        }

        if (stats.orphanedDatasets > stats.totalDatasets * 0.2) {
            recommendations.push(
                "**Medium Priority**: Clean up orphaned datasets - over 20% are unused",
            );
        }

        if (stats.avgInputsPerDataflow > 10) {
            recommendations.push(
                "**Low Priority**: Consider breaking down complex dataflows with many inputs",
            );
        }

        if (recommendations.length === 0) {
            recommendations.push(
                "Your data pipeline is well-maintained! Continue regular monitoring.",
            );
        }

        return recommendations;
    }

    private generateDataflowDiagram(dataflow: DomoDataflow): string {
        const lines: string[] = ["graph LR"];

        // Add input nodes
        if (dataflow.inputs && dataflow.inputs.length > 0) {
            dataflow.inputs.forEach((input, idx: number) => {
                const inputId = `input${idx}`;
                lines.push(`    ${inputId}["${input.name}"]:::dataset`);
                lines.push(`    ${inputId} --> dataflow`);
            });
        }

        // Add dataflow node
        lines.push(`    dataflow("${dataflow.name}"):::dataflow`);

        // Add output nodes
        if (dataflow.outputs && dataflow.outputs.length > 0) {
            dataflow.outputs.forEach((output, idx: number) => {
                const outputId = `output${idx}`;
                lines.push(`    dataflow --> ${outputId}`);
                lines.push(`    ${outputId}["${output.name}"]:::dataset`);
            });
        }

        // Add styling
        lines.push("");
        lines.push(
            "    classDef dataset fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
        );
        lines.push(
            "    classDef dataflow fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
        );

        return lines.join("\n");
    }

    private generateFocusedDiagram(
        builder: DataLineageBuilder,
        entityId: string,
        maxDepth: number,
    ): string {
        const fullGraph = builder.exportForVisualization();
        const relevantNodes = new Set<string>();
        const visited = new Set<string>();

        // BFS to find nodes within maxDepth
        const queue: { id: string; depth: number }[] = [
            { id: entityId, depth: 0 },
        ];

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;

            if (visited.has(id) || depth > maxDepth) continue;

            visited.add(id);
            relevantNodes.add(id);

            // Find connected nodes
            fullGraph.links.forEach(link => {
                if (link.source === id && depth < maxDepth) {
                    queue.push({ id: link.target, depth: depth + 1 });
                }
                if (link.target === id && depth < maxDepth) {
                    queue.push({ id: link.source, depth: depth + 1 });
                }
            });
        }

        // Build diagram
        const lines: string[] = ["graph TD"];

        // Add nodes
        fullGraph.nodes.forEach(node => {
            if (relevantNodes.has(node.id)) {
                const label = node.name.replace(/"/g, "'");
                const highlight =
                    node.id === entityId
                        ? ":::" + node.type + "-highlight"
                        : ":::" + node.type;

                if (node.type === "dataset") {
                    lines.push(`    ${node.id}["${label}"]${highlight}`);
                } else {
                    lines.push(`    ${node.id}("${label}")${highlight}`);
                }
            }
        });

        // Add edges
        fullGraph.links.forEach(link => {
            if (
                relevantNodes.has(link.source) &&
                relevantNodes.has(link.target)
            ) {
                const arrow = link.type === "input" ? "-->" : "==>";
                lines.push(`    ${link.source} ${arrow} ${link.target}`);
            }
        });

        // Add styling
        lines.push("");
        lines.push(
            "    classDef dataset fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
        );
        lines.push(
            "    classDef dataflow fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
        );
        lines.push(
            "    classDef dataset-highlight fill:#ffd54f,stroke:#f57c00,stroke-width:3px",
        );
        lines.push(
            "    classDef dataflow-highlight fill:#ffcc80,stroke:#e65100,stroke-width:3px",
        );

        return lines.join("\n");
    }

    private generateFullLineageDiagram(builder: DataLineageBuilder): string {
        const graph = builder.exportForVisualization();
        const lines: string[] = ["graph TD"];

        // Add all nodes
        graph.nodes.forEach(node => {
            const label = node.name.replace(/"/g, "'");
            if (node.type === "dataset") {
                lines.push(`    ${node.id}["${label}"]:::dataset`);
            } else {
                lines.push(`    ${node.id}("${label}"):::dataflow`);
            }
        });

        // Add all edges
        graph.links.forEach(link => {
            const arrow = link.type === "input" ? "-->" : "==>";
            lines.push(`    ${link.source} ${arrow} ${link.target}`);
        });

        // Add styling
        lines.push("");
        lines.push(
            "    classDef dataset fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
        );
        lines.push(
            "    classDef dataflow fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
        );

        return lines.join("\n");
    }
}
