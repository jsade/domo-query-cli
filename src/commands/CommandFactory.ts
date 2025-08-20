import type { Command } from "../types/shellTypes";
import { HelpCommand } from "./HelpCommand";
import { ExitCommand } from "./ExitCommand";
import { ClearCommand } from "./ClearCommand";
import { ListCardsCommand } from "./ListCardsCommand";
import { ListPagesCommand } from "./ListPagesCommand";
import { ListDatasetsCommand } from "./ListDatasetsCommand";
import { GetDatasetCommand } from "./GetDatasetCommand";
import { ListDataflowsCommand } from "./ListDataflowsCommand";
import { GetDataflowCommand } from "./GetDataflowCommand";
import { ListDataflowExecutionsCommand } from "./ListDataflowExecutionsCommand";
import { GetDataflowExecutionCommand } from "./GetDataflowExecutionCommand";
import { ExecuteDataflowCommand } from "./ExecuteDataflowCommand";
import { RenderCardCommand } from "./RenderCardCommand";
import { ShowLineageCommand } from "./ShowLineageCommand";
import { CacheStatusCommand } from "./CacheStatusCommand";
import { GenerateLineageReportCommand } from "./GenerateLineageReportCommand";

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

        // Register dataflow commands
        const listDataflowsCommand = new ListDataflowsCommand();
        this.commands.set(listDataflowsCommand.name, listDataflowsCommand);

        const getDataflowCommand = new GetDataflowCommand();
        this.commands.set(getDataflowCommand.name, getDataflowCommand);

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

        // Register render card command with provider for card listing
        const renderCardCommand = new RenderCardCommand(() =>
            listCardsCommand.getCards(),
        );
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
