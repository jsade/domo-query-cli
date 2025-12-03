import { getDatasetV3, V3DatasetResponse } from "../api/clients/domoClient";
import { log } from "../utils/logger";
import { BaseCommand } from "./BaseCommand";
import { TerminalFormatter } from "../utils/terminalFormatter";
import chalk from "chalk";

/**
 * Gets dataset information using the v3 API endpoint.
 * Requires full authentication (API token + customer domain).
 */
export class GetDatasetV3Command extends BaseCommand {
    public readonly name = "get-dataset-v3";
    public readonly description =
        "Gets dataset information using the v3 API (requires full authentication)";

    /**
     * Executes the get-dataset-v3 command
     * @param args - Command arguments
     */
    public async execute(args?: string[]): Promise<void> {
        try {
            const { parsed } = this.parseOutputConfig(args);

            // Extract ID from positional args
            const datasetId = parsed.positional[0];

            if (!datasetId) {
                this.outputErrorResult({
                    message: "No dataset ID provided",
                    code: "MISSING_DATASET_ID",
                });
                return;
            }

            // Fetch from v3 API (will throw if auth not configured)
            const dataset = await getDatasetV3(datasetId);

            if (dataset) {
                await this.output(
                    {
                        success: true,
                        data: { dataset },
                        metadata: { entityType: "dataset", apiVersion: "v3" },
                    },
                    () => this.displayDataset(dataset),
                    "dataset-v3",
                );
            } else {
                this.outputErrorResult({
                    message: "Dataset not found",
                    code: "DATASET_NOT_FOUND",
                });
            }
        } catch (error) {
            log.error("Error fetching dataset:", error);
            this.outputErrorResult({
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch dataset",
                code: "FETCH_ERROR",
            });
        }
    }

    /**
     * Display dataset information in terminal format
     */
    private displayDataset(dataset: V3DatasetResponse): void {
        console.log(chalk.cyan("\nDataset Details (V3 API):"));
        console.log("--------------------------");
        console.log(`ID: ${dataset.id || "N/A"}`);
        console.log(`Name: ${dataset.name || "N/A"}`);
        console.log(`Description: ${dataset.description || "N/A"}`);
        console.log(`Type: ${dataset.type || "N/A"}`);
        console.log(`Display Type: ${dataset.displayType || "N/A"}`);
        console.log(`Data Provider Type: ${dataset.dataProviderType || "N/A"}`);
        console.log(`Status: ${dataset.status || "N/A"}`);
        console.log(`State: ${dataset.state || "N/A"}`);
        console.log(`Rows: ${dataset.rowCount?.toLocaleString() || "N/A"}`);
        console.log(`Columns: ${dataset.columnCount || "N/A"}`);

        // Timestamps (v3 returns epoch milliseconds)
        if (dataset.created) {
            console.log(
                `Created: ${new Date(dataset.created).toLocaleString()}`,
            );
        }
        if (dataset.lastUpdated) {
            console.log(
                `Last Updated: ${new Date(dataset.lastUpdated).toLocaleString()}`,
            );
        }
        if (dataset.lastTouched) {
            console.log(
                `Last Touched: ${new Date(dataset.lastTouched).toLocaleString()}`,
            );
        }
        if (dataset.nextUpdate) {
            console.log(
                `Next Update: ${new Date(dataset.nextUpdate).toLocaleString()}`,
            );
        }

        // Owner
        if (dataset.owner) {
            console.log(`Owner: ${dataset.owner.name} (${dataset.owner.type})`);
        }

        // Cloud/Connector info
        if (dataset.cloudId || dataset.cloudName) {
            console.log(chalk.cyan("\nCloud/Connector Info:"));
            console.log("---------------------");
            if (dataset.cloudId) console.log(`  Cloud ID: ${dataset.cloudId}`);
            if (dataset.cloudName)
                console.log(`  Cloud Name: ${dataset.cloudName}`);
            if (dataset.cloudEngine)
                console.log(`  Cloud Engine: ${dataset.cloudEngine}`);
            if (dataset.streamId)
                console.log(`  Stream ID: ${dataset.streamId}`);
            if (dataset.accountId)
                console.log(`  Account ID: ${dataset.accountId}`);
            if (dataset.transportType)
                console.log(`  Transport Type: ${dataset.transportType}`);
        }

        // Schedule and validation
        console.log(chalk.cyan("\nSchedule & Validation:"));
        console.log("----------------------");
        console.log(
            `Schedule Active: ${dataset.scheduleActive !== undefined ? dataset.scheduleActive : "N/A"}`,
        );
        console.log(
            `Valid Configuration: ${dataset.validConfiguration !== undefined ? dataset.validConfiguration : "N/A"}`,
        );
        console.log(
            `Valid Account: ${dataset.validAccount !== undefined ? dataset.validAccount : "N/A"}`,
        );
        if (dataset.cryoStatus) {
            console.log(`Cryo Status: ${dataset.cryoStatus}`);
        }

        // Card info
        if (dataset.cardInfo) {
            console.log(chalk.cyan("\nCard Info:"));
            console.log("----------");
            console.log(`  Card Count: ${dataset.cardInfo.cardCount}`);
            console.log(`  Card View Count: ${dataset.cardInfo.cardViewCount}`);
        }

        // ADC info
        if (
            dataset.adc !== undefined ||
            dataset.adcExternal !== undefined ||
            dataset.adcSource
        ) {
            console.log(chalk.cyan("\nADC Info:"));
            console.log("---------");
            if (dataset.adc !== undefined) console.log(`  ADC: ${dataset.adc}`);
            if (dataset.adcExternal !== undefined)
                console.log(`  ADC External: ${dataset.adcExternal}`);
            if (dataset.adcSource)
                console.log(`  ADC Source: ${dataset.adcSource}`);
        }

        // Permissions and access
        console.log(chalk.cyan("\nPermissions:"));
        console.log("------------");
        console.log(`Permissions: ${dataset.permissions || "N/A"}`);
        console.log(
            `Current User Full Access: ${dataset.currentUserFullAccess !== undefined ? dataset.currentUserFullAccess : "N/A"}`,
        );
        console.log(
            `Masked: ${dataset.masked !== undefined ? dataset.masked : "N/A"}`,
        );
        console.log(
            `Hidden: ${dataset.hidden !== undefined ? dataset.hidden : "N/A"}`,
        );

        // Tags
        if (dataset.tags) {
            try {
                const tags = JSON.parse(dataset.tags);
                if (Array.isArray(tags) && tags.length > 0) {
                    console.log(chalk.cyan("\nTags:"));
                    console.log("-----");
                    console.log(`  ${tags.join(", ")}`);
                }
            } catch {
                // If not JSON, display as-is
                console.log(chalk.cyan("\nTags:"));
                console.log("-----");
                console.log(`  ${dataset.tags}`);
            }
        }

        // Formulas
        if (dataset.properties?.formulas?.formulas) {
            const formulas = Object.values(
                dataset.properties.formulas.formulas,
            );
            if (formulas.length > 0) {
                console.log(chalk.cyan("\nFormulas:"));
                console.log("---------");
                formulas.forEach(formula => {
                    console.log(
                        `  ${formula.name || "Unnamed"} (${formula.dataType || "unknown"})`,
                    );
                    if (formula.formula) {
                        console.log(`    ${formula.formula}`);
                    }
                });
            }
        }
    }

    /**
     * Shows help for the get-dataset-v3 command
     */
    public showHelp(): void {
        console.log(
            "Gets dataset information using the v3 API (requires full authentication)",
        );
        console.log("Usage: get-dataset-v3 <dataset_id> [options]");
        console.log(chalk.cyan("\nAuthentication Requirements:"));
        console.log(
            "  This command requires API token authentication with customer domain.",
        );
        console.log("  Set the following environment variables:");
        console.log("    DOMO_API_TOKEN    Your Domo API token");
        console.log(
            "    DOMO_API_HOST     Your Domo instance (e.g., company.domo.com)",
        );
        console.log(chalk.cyan("\nParameters:"));
        console.log("  dataset_id          Dataset ID (GUID format)");

        console.log(chalk.cyan("\nOutput Options:"));
        const optionsData = [
            {
                Option: "--format=json",
                Description: "Output as JSON to stdout",
            },
            {
                Option: "--export",
                Description: "Export to timestamped JSON file",
            },
            { Option: "--export=md", Description: "Export as Markdown" },
            { Option: "--export=both", Description: "Export both formats" },
            {
                Option: "--export-path=<dir>",
                Description: "Custom export directory",
            },
            {
                Option: "--output=<path>",
                Description: "Write to specific file",
            },
            { Option: "--quiet", Description: "Suppress export messages" },
        ];
        console.log(TerminalFormatter.table(optionsData));

        console.log(chalk.cyan("\nLegacy Aliases (still supported):"));
        const legacyData = [
            { Flag: "--save", "Maps To": "--export" },
            { Flag: "--save-json", "Maps To": "--export=json" },
            { Flag: "--save-md", "Maps To": "--export=md" },
            { Flag: "--save-both", "Maps To": "--export=both" },
            { Flag: "--path", "Maps To": "--export-path" },
        ];
        console.log(TerminalFormatter.table(legacyData));

        console.log(chalk.cyan("\nV3-Specific Fields:"));
        console.log(
            "  - Cloud/Connector info: cloudId, cloudName, cloudEngine, streamId",
        );
        console.log(
            "  - Schedule info: scheduleActive, nextUpdate, validConfiguration",
        );
        console.log("  - ADC info: adc, adcExternal, adcSource");
        console.log("  - Formulas: Beast Mode calculations defined on dataset");
        console.log(
            "  - Card info: cardCount, cardViewCount from cardInfo object",
        );
        console.log(chalk.cyan("\nExamples:"));
        console.log(
            "  get-dataset-v3 abc-123-def             Get v3 details for dataset",
        );
        console.log("  get-dataset-v3 abc-123 --format=json   Output as JSON");
        console.log(
            "  get-dataset-v3 abc-123 --export=md     Export to markdown file",
        );
    }

    /**
     * Autocomplete support for command flags
     */
    public autocomplete(partial: string): string[] {
        const flags = [
            "--format=json",
            "--export",
            "--export=json",
            "--export=md",
            "--export=both",
            "--export-path",
            "--output",
            "--quiet",
            "--save",
            "--save-json",
            "--save-md",
            "--save-both",
            "--path",
        ];
        return flags.filter(flag => flag.startsWith(partial));
    }
}
