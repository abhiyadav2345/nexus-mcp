import { Command } from "commander";
import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { printBanner, printSuccess, printError, printInfo, printLine, setCiMode } from "../utils/output.js";

const NEXUS_YAML_TEMPLATE = `# nexus.yaml — Nexus MCP Configuration
# Run 'nexus doctor' to validate this config
version: 1

server:
  # Transport type: http (for HTTP/SSE servers) or stdio (for script-based servers)
  transport: http

  # For HTTP servers:
  url: http://localhost:8000/mcp

  # For stdio servers (comment out url and uncomment this):
  # script: node server.js

  # Connection timeout in milliseconds
  timeout: 10000

analysis:
  rules:
    # Add rule codes here to disable them globally
    # e.g. ignore: [W104, E301]
    ignore: []

  thresholds:
    # Percentage of keyword overlap to trigger E110 Tool Ambiguity (default: 80)
    ambiguityOverlapPercent: 80

contracts:
  # Directory containing your .yaml contract files (one per tool)
  dir: ./tools
`;

const CONTRACT_EXAMPLE_TEMPLATE = `# tools/_example.yaml
# Rename this file to <tool-name>.yaml and customise it.
# Run 'nexus test' to execute all contracts in this directory.

tool: your_tool_name
description: "What this tool does"
sideEffects: none    # none | read | write | delete
maxOutputBytes: 51200  # 50KB limit

testCases:
  - name: "valid input"
    input:
      param1: "example_value"
    expect:
      status: success
      fields: [field1, field2]   # Required fields in response

  - name: "empty input should fail"
    input:
      param1: ""
    expect:
      status: error
`;

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold nexus.yaml config and tools/ contract directory")
    .option("--force", "Overwrite existing files")
    .action(async (options: { force?: boolean }) => {
      setCiMode(false);
      printBanner();
      printLine(" Initialising Nexus MCP project…\n");

      const configPath = "nexus.yaml";
      const toolsDir = "tools";
      const exampleContractPath = join(toolsDir, "_example.yaml");

      // ── Write nexus.yaml ──────────────────────────────────────────────────
      if (existsSync(configPath) && !options.force) {
        printError(`${configPath} already exists. Use --force to overwrite.`);
      } else {
        await writeFile(configPath, NEXUS_YAML_TEMPLATE, "utf-8");
        printSuccess(`Created ${configPath}`);
      }

      // ── Create tools/ directory ───────────────────────────────────────────
      if (!existsSync(toolsDir)) {
        await mkdir(toolsDir, { recursive: true });
        printSuccess(`Created ${toolsDir}/`);
      } else {
        printInfo(`${toolsDir}/ already exists — skipped`);
      }

      // ── Write example contract ────────────────────────────────────────────
      if (existsSync(exampleContractPath) && !options.force) {
        printInfo(`${exampleContractPath} already exists — skipped`);
      } else {
        await writeFile(exampleContractPath, CONTRACT_EXAMPLE_TEMPLATE, "utf-8");
        printSuccess(`Created ${exampleContractPath}`);
      }

      printLine("\n Next steps:");
      printLine("  1. Edit nexus.yaml and set your server URL or script");
      printLine("  2. Run: nexus doctor       → validate config + connection");
      printLine("  3. Run: nexus list         → see all your tools");
      printLine("  4. Run: nexus analyse      → find issues in tool definitions");
      printLine("  5. Add contracts in tools/ → run: nexus test\n");
    });
}
