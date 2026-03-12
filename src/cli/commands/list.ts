import { Command } from "commander";
import ora from "ora";
import { createTransport } from "../../transport/index.js";
import { printBanner, printToolList, printError, printInfo, setCiMode } from "../utils/output.js";
import { setVerbose, debug } from "../utils/logger.js";
import type { ListOptions } from "../../types/index.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List all tools, resources, and prompts exposed by an MCP server")
    .option("--url <url>", "HTTP URL of the MCP server")
    .option("--script <path>", "Script to launch the MCP server via stdio")
    .option("--transport <type>", "Transport type: http | stdio", "http")
    .option("--json", "Output as JSON")
    .option("--verbose", "Enable verbose logging")
    .action(async (options: ListOptions) => {
      setCiMode(false);
      setVerbose(options.verbose ?? false);
      printBanner();

      if (!options.url && !options.script) {
        printError("Provide either --url or --script to specify the MCP server.");
        process.exit(2);
      }

      const spinner = ora("Connecting to MCP server…").start();
      const transport = createTransport(options.transport ?? "http", {
        url: options.url,
        script: options.script,
        timeoutMs: 10000,
      });

      try {
        const connectResult = await transport.connect();
        if (!connectResult.ok) {
          spinner.fail("Connection failed");
          printError(connectResult.error.message);
          printInfo("Check: Is the server running? Is the URL correct? Is the transport right?");
          process.exit(2);
        }

        const { serverName, serverVersion } = connectResult.value;
        spinner.succeed(
          `Connected to ${serverName ?? "MCP server"}${serverVersion ? ` v${serverVersion}` : ""}`,
        );
        debug(`Server: ${serverName} ${serverVersion}`);

        const [toolsResult, resourcesResult, promptsResult] = await Promise.all([
          transport.listTools(),
          transport.listResources(),
          transport.listPrompts(),
        ]);

        const tools = toolsResult.ok ? toolsResult.value : [];
        const resources = resourcesResult.ok ? resourcesResult.value : [];
        const prompts = promptsResult.ok ? promptsResult.value : [];

        if (options.json) {
          process.stdout.write(JSON.stringify({ tools, resources, prompts }, null, 2) + "\n");
        } else {
          printToolList(tools, resources, prompts);
        }
      } finally {
        await transport.disconnect();
      }
    });
}
