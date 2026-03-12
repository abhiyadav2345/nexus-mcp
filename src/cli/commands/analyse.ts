import { Command } from "commander";
import ora from "ora";
import { createTransport } from "../../transport/index.js";
import { runAnalysis } from "../../analyser/index.js";
import {
  printBanner, printAnalysisResult, printError, printInfo, setCiMode,
} from "../utils/output.js";
import { setVerbose, debug } from "../utils/logger.js";
import type { AnalyseOptions } from "../../types/index.js";

export function registerAnalyseCommand(program: Command): void {
  program
    .command("analyse")
    .description("Run static analysis on MCP server tool definitions")
    .option("--url <url>", "HTTP URL of the MCP server")
    .option("--script <path>", "Script to launch via stdio")
    .option("--transport <type>", "Transport type: http | stdio", "http")
    .option("--ci", "CI mode: plain output, strict exit codes")
    .option("--json", "Output results as JSON")
    .option("--ignore <codes>", "Comma-separated rule codes to ignore (e.g. W104,E301)")
    .option("--verbose", "Enable verbose logging")
    .action(async (options: AnalyseOptions) => {
      setCiMode(options.ci ?? false);
      setVerbose(options.verbose ?? false);

      if (!options.ci) printBanner();

      if (!options.url && !options.script) {
        printError("Provide either --url or --script to specify the MCP server.");
        process.exit(2);
      }

      const ignoredRules = options.ignore
        ? options.ignore.split(",").map((s) => s.trim())
        : [];

      debug(`Ignored rules: ${ignoredRules.join(", ") || "none"}`);

      const spinner = options.ci ? null : ora("Connecting to MCP server…").start();
      const transport = createTransport(options.transport ?? "http", {
        url: options.url,
        script: options.script,
        timeoutMs: 10000,
      });

      try {
        const connectResult = await transport.connect();
        if (!connectResult.ok) {
          spinner?.fail("Connection failed");
          printError(connectResult.error.message);
          printInfo("Check: Is the server running? Is the URL correct?");
          process.exit(2);
        }

        const serverUrl = options.url ?? options.script ?? "unknown";
        if (spinner) spinner.text = "Fetching tool definitions…";

        const toolsResult = await transport.listTools();
        const resourcesResult = await transport.listResources();

        if (!toolsResult.ok) {
          spinner?.fail("Failed to fetch tools");
          printError(toolsResult.error.message);
          process.exit(2);
        }

        const tools = toolsResult.value;
        const resources = resourcesResult.ok ? resourcesResult.value : [];

        if (spinner) spinner.text = `Analysing ${tools.length} tools…`;

        const result = runAnalysis(tools, resources, serverUrl, {
          ignoreRules: ignoredRules,
        });

        spinner?.stop();

        if (options.json) {
          process.stdout.write(JSON.stringify(result, null, 2) + "\n");
          process.exit(result.errorCount > 0 ? 1 : 0);
        }

        printAnalysisResult(result);
        process.exit(result.errorCount > 0 ? 1 : 0);
      } finally {
        await transport.disconnect();
      }
    });
}
