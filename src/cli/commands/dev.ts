import { Command } from "commander";
import { printBanner, printLine, printInfo, setCiMode } from "../utils/output.js";
import chalk from "chalk";
import boxen from "boxen";

export function registerDevCommand(program: Command): void {
  program
    .command("dev")
    .description("Interactive LLM-MCP development session (coming in v0.2.0)")
    .option("--exec", "Execute tool calls (not just preview)")
    .option("--llm <provider>", "LLM provider: openai | claude | ollama")
    .option("--save-events <path>", "Save event log to file")
    .option("--url <url>", "HTTP URL of the MCP server")
    .action(() => {
      setCiMode(false);
      printBanner();

      printLine(
        boxen(
          chalk.bold("nexus dev") +
            " is coming in " +
            chalk.cyan("v0.2.0") +
            "\n\n" +
            chalk.dim("This command will open an interactive chat interface\n") +
            chalk.dim("where you can talk to your MCP server via an LLM\n") +
            chalk.dim("and watch every tool call in real-time.\n\n") +
            chalk.dim("Supported providers: OpenAI, Claude, Ollama (local)"),
          { padding: 1, borderColor: "cyan", borderStyle: "round" },
        ),
      );

      printLine("");
      printInfo("In the meantime, try:");
      printLine(chalk.dim("  nexus list      → see all tools your server exposes"));
      printLine(chalk.dim("  nexus analyse   → find issues in tool definitions"));
      printLine(chalk.dim("  nexus test      → run contract tests\n"));
    });
}
