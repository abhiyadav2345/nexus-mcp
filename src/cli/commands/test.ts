import { Command } from "commander";
import { readdirSync, existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { parse } from "yaml";
import ora from "ora";
import { createTransport } from "../../transport/index.js";
import {
  printBanner, printLine, printDivider, printError, printSuccess,
  printWarning, printInfo, setCiMode,
} from "../utils/output.js";
import type { TestOptions, ContractFile } from "../../types/index.js";
import chalk from "chalk";

export function registerTestCommand(program: Command): void {
  program
    .command("test")
    .description("Run contract tests against an MCP server")
    .option("--url <url>", "HTTP URL of the MCP server")
    .option("--script <path>", "Script to launch via stdio")
    .option("--transport <type>", "Transport type: http | stdio", "http")
    .option("--tool <name>", "Only run tests for this specific tool")
    .option("--ci", "CI mode: plain output, strict exit codes")
    .option("--strict", "Exit 1 on warnings too")
    .option("--connection", "Only test connection, skip tool execution")
    .option("--dir <path>", "Contract directory path", "./tools")
    .action(async (options: TestOptions & { dir?: string }) => {
      setCiMode(options.ci ?? false);
      if (!options.ci) printBanner();

      if (!options.url && !options.script) {
        printError("Provide either --url or --script to specify the MCP server.");
        process.exit(2);
      }

      const contractsDir = options.dir ?? "./tools";

      if (!existsSync(contractsDir)) {
        printWarning(`No contracts directory found at "${contractsDir}". Run 'nexus init' first.`);
        printInfo("Run 'nexus init' to create the tools/ directory with an example contract.");
        process.exit(0);
      }

      // Load contract files
      const files = readdirSync(contractsDir).filter(
        (f) => f.endsWith(".yaml") && !f.startsWith("_"),
      );

      if (files.length === 0) {
        printWarning(`No contract files found in "${contractsDir}".`);
        printInfo("Create a .yaml file for each tool you want to test.");
        process.exit(0);
      }

      const contracts: ContractFile[] = [];
      for (const file of files) {
        try {
          const raw = await readFile(join(contractsDir, file), "utf-8");
          const contract = parse(raw) as ContractFile;
          if (options.tool && contract.tool !== options.tool) continue;
          contracts.push(contract);
        } catch (e) {
          printError(`Failed to parse ${file}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (contracts.length === 0) {
        printInfo(
          options.tool
            ? `No contract found for tool "${options.tool}".`
            : "No valid contracts to run.",
        );
        process.exit(0);
      }

      const spinner = options.ci ? null : ora("Connecting to MCP server…").start();
      const transport = createTransport(options.transport ?? "http", {
        url: options.url,
        script: options.script,
        timeoutMs: 10000,
      });

      let passed = 0;
      let failed = 0;

      try {
        const connectResult = await transport.connect();
        if (!connectResult.ok) {
          spinner?.fail("Connection failed");
          printError(connectResult.error.message);
          process.exit(2);
        }
        spinner?.succeed("Connected");

        if (options.connection) {
          printSuccess("Connection test passed.");
          process.exit(0);
        }

        printDivider();
        printLine(options.ci ? "" : chalk.bold(" Contract Tests\n"));

        for (const contract of contracts) {
          printLine(options.ci ? `\nTOOL: ${contract.tool}` : chalk.cyan(`\n  ${contract.tool}`));

          for (const testCase of contract.testCases ?? []) {
            const start = Date.now();
            try {
              const result = await transport.callTool(contract.tool, testCase.input);
              const durationMs = Date.now() - start;

              if (!result.ok) {
                // Tool returned an error
                if (testCase.expect.status === "error") {
                  passed++;
                  printLine(
                    options.ci
                      ? `  PASS: ${testCase.name} (${durationMs}ms)`
                      : `    ${chalk.green("✔")} ${testCase.name} ${chalk.dim(`(${durationMs}ms)`)}`,
                  );
                } else {
                  failed++;
                  printLine(
                    options.ci
                      ? `  FAIL: ${testCase.name} — expected success but got error: ${result.error.message}`
                      : `    ${chalk.red("✖")} ${testCase.name} ${chalk.red(`— expected success, got error: ${result.error.message}`)}`,
                  );
                }
              } else {
                if (testCase.expect.status === "error") {
                  failed++;
                  printLine(
                    options.ci
                      ? `  FAIL: ${testCase.name} — expected error but succeeded`
                      : `    ${chalk.red("✖")} ${testCase.name} ${chalk.red("— expected error but tool succeeded")}`,
                  );
                } else {
                  // Check required fields
                  const output = result.value as Record<string, unknown>;
                  const missingFields = (testCase.expect.fields ?? []).filter(
                    (field) => !(field in (output ?? {})),
                  );

                  if (missingFields.length > 0) {
                    failed++;
                    printLine(
                      options.ci
                        ? `  FAIL: ${testCase.name} — missing fields: ${missingFields.join(", ")}`
                        : `    ${chalk.red("✖")} ${testCase.name} ${chalk.red(`— missing fields: ${missingFields.join(", ")}`)}`,
                    );
                  } else {
                    passed++;
                    printLine(
                      options.ci
                        ? `  PASS: ${testCase.name} (${durationMs}ms)`
                        : `    ${chalk.green("✔")} ${testCase.name} ${chalk.dim(`(${durationMs}ms)`)}`,
                    );
                  }
                }
              }
            } catch (e) {
              failed++;
              printLine(
                options.ci
                  ? `  FAIL: ${testCase.name} — exception: ${e instanceof Error ? e.message : String(e)}`
                  : `    ${chalk.red("✖")} ${testCase.name} ${chalk.red(`— ${e instanceof Error ? e.message : String(e)}`)}`,
              );
            }
          }
        }

        printDivider();
        const total = passed + failed;
        if (options.ci) {
          printLine(`RESULT: ${passed}/${total} tests passed, ${failed} failed`);
        } else {
          const passStr = chalk.green(`${passed} passed`);
          const failStr = failed > 0 ? chalk.red(`${failed} failed`) : chalk.dim("0 failed");
          printLine(`\n  ${passStr}  ${failStr}  ${chalk.dim(`of ${total} total`)}\n`);
        }

        process.exit(failed > 0 ? 1 : 0);
      } finally {
        await transport.disconnect();
      }
    });
}
