import { Command } from "commander";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { parse } from "yaml";
import { createTransport } from "../../transport/index.js";
import {
  printBanner, printDoctorCheck, printLine, printDivider, printError, setCiMode,
} from "../utils/output.js";
import type { CommonOptions } from "../../types/index.js";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Validate nexus.yaml config and test MCP server connection")
    .option("--url <url>", "HTTP URL of the MCP server (overrides config)")
    .option("--script <path>", "Script to launch via stdio (overrides config)")
    .option("--config <path>", "Path to nexus.yaml config file", "nexus.yaml")
    .action(async (options: CommonOptions & { config: string }) => {
      setCiMode(false);
      printBanner();
      printLine(" Running doctor checks…\n");
      printDivider();

      let allPassed = true;
      let serverUrl: string | undefined = options.url;
      let serverScript: string | undefined = options.script;
      let transport = options.transport ?? "http";

      // ── Check 1: Config file ──────────────────────────────────────────────
      const configPath = options.config ?? "nexus.yaml";
      if (existsSync(configPath)) {
        try {
          const raw = await readFile(configPath, "utf-8");
          const config = parse(raw) as Record<string, unknown>;

          if (typeof config.version !== "number") {
            printDoctorCheck(
              `Config file (${configPath})`,
              false,
              "Missing or invalid 'version' field",
            );
            allPassed = false;
          } else {
            printDoctorCheck(`Config file (${configPath})`, true, "Valid YAML, version field OK");

            // Extract server config from file if not overridden by flags
            const serverConfig = config.server as Record<string, unknown> | undefined;
            if (serverConfig) {
              if (!serverUrl && typeof serverConfig.url === "string") {
                serverUrl = serverConfig.url;
              }
              if (!serverScript && typeof serverConfig.script === "string") {
                serverScript = serverConfig.script;
              }
              if (typeof serverConfig.transport === "string") {
                transport = serverConfig.transport as typeof transport;
              }
            }
          }
        } catch (e) {
          printDoctorCheck(
            `Config file (${configPath})`,
            false,
            `Invalid YAML: ${e instanceof Error ? e.message : String(e)}`,
          );
          allPassed = false;
        }
      } else {
        printDoctorCheck(
          `Config file (${configPath})`,
          false,
          "Not found — run 'nexus init' to create one",
        );
        // Not fatal — can still test connection with --url flag
      }

      // ── Check 2: Server URL/script provided ───────────────────────────────
      if (!serverUrl && !serverScript) {
        printDoctorCheck(
          "Server config",
          false,
          "No --url or --script provided and none found in config",
        );
        allPassed = false;
        printDivider();
        printLine(allPassed ? "\n All checks passed!\n" : "\n Some checks failed.\n");
        process.exit(allPassed ? 0 : 2);
      } else {
        printDoctorCheck(
          "Server config",
          true,
          serverUrl ?? serverScript ?? "",
        );
      }

      // ── Check 3: Network/process reachability ─────────────────────────────
      const nexusTransport = createTransport(transport, {
        url: serverUrl,
        script: serverScript,
        timeoutMs: 8000,
      });

      try {
        const result = await nexusTransport.connect();
        if (result.ok) {
          const { serverName, serverVersion, capabilities } = result.value;
          printDoctorCheck(
            "MCP connection",
            true,
            `${serverName ?? "MCP server"}${serverVersion ? ` v${serverVersion}` : ""}`,
          );

          const capKeys = Object.keys(capabilities);
          printDoctorCheck(
            "Protocol capabilities",
            capKeys.length > 0,
            capKeys.length > 0 ? capKeys.join(", ") : "no capabilities advertised",
          );

          const toolsResult = await nexusTransport.listTools();
          if (toolsResult.ok) {
            printDoctorCheck(
              "Tools listing",
              true,
              `${toolsResult.value.length} tool${toolsResult.value.length !== 1 ? "s" : ""} found`,
            );
          } else {
            printDoctorCheck("Tools listing", false, toolsResult.error.message);
            allPassed = false;
          }
        } else {
          printDoctorCheck("MCP connection", false, result.error.message);
          printLine("");
          printError("Connection failed. Common causes:");
          printError("  • Server is not running (start it first)");
          printError("  • Wrong URL or port");
          printError("  • Wrong --transport (try --transport stdio for script-based servers)");
          allPassed = false;
        }
      } finally {
        await nexusTransport.disconnect();
      }

      printDivider();
      printLine(allPassed ? "\n ✔ All checks passed!\n" : "\n ✖ Some checks failed. See details above.\n");
      process.exit(allPassed ? 0 : 2);
    });
}
