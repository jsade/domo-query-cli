import type { Command } from "../types/shellTypes";
import { HelpCommand } from "./HelpCommand";
import { ExitCommand } from "./ExitCommand";
import { ClearCommand } from "./ClearCommand";
import { ListCardsCommand } from "./ListCardsCommand";
import { ListPagesCommand } from "./ListPagesCommand";
import { ListDatasetsCommand } from "./ListDatasetsCommand";
import { GetDatasetCommand } from "./GetDatasetCommand";
import { GetCardCommand } from "./GetCardCommand";
import { UpdateDatasetPropertiesCommand } from "./UpdateDatasetPropertiesCommand";
import { ListDataflowsCommand } from "./ListDataflowsCommand";
import { GetDataflowCommand } from "./GetDataflowCommand";
import { GetDataflowLineageCommand } from "./GetDataflowLineageCommand";
import { GetDatasetLineageCommand } from "./GetDatasetLineageCommand";
import { GetDatasetParentsCommand } from "./GetDatasetParentsCommand";
import { GetDatasetChildrenCommand } from "./GetDatasetChildrenCommand";
import { ListDataflowExecutionsCommand } from "./ListDataflowExecutionsCommand";
import { GetDataflowExecutionCommand } from "./GetDataflowExecutionCommand";
import { ExecuteDataflowCommand } from "./ExecuteDataflowCommand";
import { RenderCardCommand } from "./RenderCardCommand";
import { ShowLineageCommand } from "./ShowLineageCommand";
import { CacheStatusCommand } from "./CacheStatusCommand";
import { GenerateLineageReportCommand } from "./GenerateLineageReportCommand";
import { DbStatusCommand } from "./DbStatusCommand";
import { DbSyncCommand } from "./DbSyncCommand";
import { DbClearCommand } from "./DbClearCommand";
import { DbExportCommand } from "./DbExportCommand";
import { DbImportCommand } from "./DbImportCommand";
import { DbRepairCommand } from "./DbRepairCommand";
import { ListUsersCommand } from "./ListUsersCommand";
import { GetUserCommand } from "./GetUserCommand";

/**
 * Factory class for creating and managing command instances
 */
export class CommandFactory {
    private commands: Map<string, Command> = new Map();
    private setRunning: (running: boolean) => void;

    /**
     * Creates a new CommandFactory
     * @param setRunning - Function to change the shell's running state
     */
    constructor(setRunning: (running: boolean) => void) {
        this.setRunning = setRunning;
        this.registerCommands();
    }

    /**
     * Registers all available commands
     */
    private registerCommands(): void {
        // Register basic commands
        const exitCommand = new ExitCommand(this.setRunning);
        this.commands.set(exitCommand.name, exitCommand);

        const clearCommand = new ClearCommand();
        this.commands.set(clearCommand.name, clearCommand);

        // Register data listing commands
        const listCardsCommand = new ListCardsCommand();
        this.commands.set(listCardsCommand.name, listCardsCommand);

        const listPagesCommand = new ListPagesCommand();
        this.commands.set(listPagesCommand.name, listPagesCommand);

        const listDatasetsCommand = new ListDatasetsCommand();
        this.commands.set(listDatasetsCommand.name, listDatasetsCommand);

        const getDatasetCommand = new GetDatasetCommand();
        this.commands.set(getDatasetCommand.name, getDatasetCommand);

        const getCardCommand = new GetCardCommand();
        this.commands.set(getCardCommand.name, getCardCommand);

        const updateDatasetPropertiesCommand =
            new UpdateDatasetPropertiesCommand();
        this.commands.set(
            updateDatasetPropertiesCommand.name,
            updateDatasetPropertiesCommand,
        );

        // Register dataflow commands
        const listDataflowsCommand = new ListDataflowsCommand();
        this.commands.set(listDataflowsCommand.name, listDataflowsCommand);

        const getDataflowCommand = new GetDataflowCommand();
        this.commands.set(getDataflowCommand.name, getDataflowCommand);

        const getDataflowLineageCommand = new GetDataflowLineageCommand();
        this.commands.set(
            getDataflowLineageCommand.name,
            getDataflowLineageCommand,
        );

        const getDatasetLineageCommand = new GetDatasetLineageCommand();
        this.commands.set(
            getDatasetLineageCommand.name,
            getDatasetLineageCommand,
        );

        const getDatasetParentsCommand = new GetDatasetParentsCommand();
        this.commands.set(
            getDatasetParentsCommand.name,
            getDatasetParentsCommand,
        );

        const getDatasetChildrenCommand = new GetDatasetChildrenCommand();
        this.commands.set(
            getDatasetChildrenCommand.name,
            getDatasetChildrenCommand,
        );

        const listDataflowExecutionsCommand =
            new ListDataflowExecutionsCommand();
        this.commands.set(
            listDataflowExecutionsCommand.name,
            listDataflowExecutionsCommand,
        );

        const getDataflowExecutionCommand = new GetDataflowExecutionCommand();
        this.commands.set(
            getDataflowExecutionCommand.name,
            getDataflowExecutionCommand,
        );

        const executeDataflowCommand = new ExecuteDataflowCommand();
        this.commands.set(executeDataflowCommand.name, executeDataflowCommand);

        // Register render card command - now self-sufficient
        const renderCardCommand = new RenderCardCommand();
        this.commands.set(renderCardCommand.name, renderCardCommand);

        // Register lineage command
        const showLineageCommand = new ShowLineageCommand();
        this.commands.set(showLineageCommand.name, showLineageCommand);

        // Register cache status command
        const cacheStatusCommand = new CacheStatusCommand();
        this.commands.set(cacheStatusCommand.name, cacheStatusCommand);

        // Register lineage report command
        const generateLineageReportCommand = new GenerateLineageReportCommand();
        this.commands.set(
            generateLineageReportCommand.name,
            generateLineageReportCommand,
        );

        // Register database commands
        const dbStatusCommand = new DbStatusCommand();
        this.commands.set(dbStatusCommand.name, dbStatusCommand);

        const dbSyncCommand = new DbSyncCommand();
        this.commands.set(dbSyncCommand.name, dbSyncCommand);

        const dbClearCommand = new DbClearCommand();
        this.commands.set(dbClearCommand.name, dbClearCommand);

        const dbExportCommand = new DbExportCommand();
        this.commands.set(dbExportCommand.name, dbExportCommand);

        const dbImportCommand = new DbImportCommand();
        this.commands.set(dbImportCommand.name, dbImportCommand);

        const dbRepairCommand = new DbRepairCommand();
        this.commands.set(dbRepairCommand.name, dbRepairCommand);

        // Register user commands
        const listUsersCommand = new ListUsersCommand();
        this.commands.set(listUsersCommand.name, listUsersCommand);

        const getUserCommand = new GetUserCommand();
        this.commands.set(getUserCommand.name, getUserCommand);

        // Help command needs access to all commands and must be registered last
        const helpCommand = new HelpCommand(this.commands);
        this.commands.set(helpCommand.name, helpCommand);
    }

    /**
     * Gets a command by name
     * @param name - Command name
     * @returns The command if found, undefined otherwise
     */
    public getCommand(name: string): Command | undefined {
        return this.commands.get(name.toLowerCase());
    }

    /**
     * Gets all registered commands
     * @returns Map of all commands
     */
    public getAllCommands(): Map<string, Command> {
        return this.commands;
    }
}
