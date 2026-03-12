import chalk from "chalk";
import boxen from "boxen";
import { table } from "table";
import type { Finding, AnalysisResult, McpTool, McpResource, McpPrompt } from "../../types/index.js";

let CI_MODE = false;

export function setCiMode(ci: boolean): void {
  CI_MODE = ci;
}

// ─── Basic Printers ────────────────────────────────────────────────────────────

export function printError(msg: string): void {
  if (CI_MODE) {
    process.stderr.write(`ERROR: ${msg}\n`);
  } else {
    process.stderr.write(chalk.red(`✖ ${msg}`) + "\n");
  }
}

export function printSuccess(msg: string): void {
  if (CI_MODE) {
    process.stdout.write(`OK: ${msg}\n`);
  } else {
    process.stdout.write(chalk.green(`✔ ${msg}`) + "\n");
  }
}

export function printWarning(msg: string): void {
  if (CI_MODE) {
    process.stdout.write(`WARN: ${msg}\n`);
  } else {
    process.stdout.write(chalk.yellow(`⚠ ${msg}`) + "\n");
  }
}

export function printInfo(msg: string): void {
  if (CI_MODE) {
    process.stdout.write(`INFO: ${msg}\n`);
  } else {
    process.stdout.write(chalk.blue(`ℹ ${msg}`) + "\n");
  }
}

export function printDim(msg: string): void {
  if (CI_MODE) {
    process.stdout.write(`${msg}\n`);
  } else {
    process.stdout.write(chalk.dim(msg) + "\n");
  }
}

export function printLine(msg = ""): void {
  process.stdout.write(msg + "\n");
}

export function printDivider(): void {
  if (CI_MODE) {
    printLine("---");
  } else {
    printLine(chalk.dim("─".repeat(60)));
  }
}

// ─── Banner ────────────────────────────────────────────────────────────────────

export function printBanner(): void {
  if (CI_MODE) return;
  const banner = `${chalk.bold.blue("nexus")} ${chalk.dim("mcp")}  ${chalk.dim("v0.1.0")}`;
  process.stdout.write(banner + "\n\n");
}

// ─── Finding Printer ───────────────────────────────────────────────────────────

function formatFinding(finding: Finding, index: number): string {
  if (CI_MODE) {
    return [
      `[${finding.severity.toUpperCase()}] ${finding.code} in ${finding.toolName}`,
      `  ${finding.message}`,
      `  Fix: ${finding.suggestion}`,
    ].join("\n");
  }

  const icon = finding.severity === "error" ? chalk.red("✖") : chalk.yellow("⚠");
  const code = finding.severity === "error"
    ? chalk.red.bold(finding.code)
    : chalk.yellow.bold(finding.code);
  const toolName = chalk.cyan(finding.toolName);

  return [
    `  ${icon} ${code}  ${chalk.dim(`[${index + 1}]`)}  ${toolName}`,
    `     ${chalk.white(finding.message)}`,
    `     ${chalk.dim("Fix:")} ${chalk.dim(finding.suggestion)}`,
    finding.docs ? `     ${chalk.dim("Docs:")} ${chalk.dim.underline(finding.docs)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Analysis Result Printer ───────────────────────────────────────────────────

export function printAnalysisResult(result: AnalysisResult): void {
  if (result.findings.length === 0) {
    if (CI_MODE) {
      printLine(`PASS: 0 issues found in ${result.toolCount} tools (${result.durationMs}ms)`);
    } else {
      printLine(
        boxen(
          `${chalk.green.bold("✔ No issues found")}\n\n` +
          `${chalk.dim(`Analysed ${result.toolCount} tools in ${result.durationMs}ms`)}`,
          { padding: 1, borderColor: "green", borderStyle: "round" },
        ),
      );
    }
    return;
  }

  // Group by severity
  const errors = result.findings.filter((f) => f.severity === "error");
  const warnings = result.findings.filter((f) => f.severity === "warning");

  if (!CI_MODE) {
    printDivider();
    printLine(chalk.bold(" Analysis Results"));
    printDivider();
  }

  result.findings.forEach((finding, i) => {
    printLine(formatFinding(finding, i));
    printLine();
  });

  printDivider();

  // Summary
  if (CI_MODE) {
    printLine(
      `RESULT: ${result.findings.length} issues found — ` +
      `${result.errorCount} errors, ${result.warningCount} warnings ` +
      `in ${result.toolCount} tools (${result.durationMs}ms)`,
    );
  } else {
    const errStr = errors.length > 0
      ? chalk.red.bold(`${errors.length} error${errors.length !== 1 ? "s" : ""}`)
      : chalk.dim("0 errors");
    const warnStr = warnings.length > 0
      ? chalk.yellow.bold(`${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`)
      : chalk.dim("0 warnings");

    printLine(
      `  ${errStr}  ${warnStr}  ${chalk.dim(`· ${result.toolCount} tools · ${result.durationMs}ms`)}`,
    );
  }
}

// ─── Tool List Printer ─────────────────────────────────────────────────────────

export function printToolList(
  tools: McpTool[],
  resources: McpResource[],
  prompts: McpPrompt[],
): void {
  if (tools.length > 0) {
    printLine(CI_MODE ? "\n=== TOOLS ===" : chalk.bold("\n Tools\n"));

    const rows = tools.map((tool) => {
      const paramCount = Object.keys(tool.inputSchema.properties ?? {}).length;
      const desc = tool.description
        ? tool.description.slice(0, 60) + (tool.description.length > 60 ? "…" : "")
        : "(no description)";
      return [tool.name, desc, String(paramCount)];
    });

    if (CI_MODE) {
      rows.forEach(([name, desc, params]) => {
        printLine(`  ${name}  |  ${desc}  |  ${params} params`);
      });
    } else {
      const tableData = [
        [chalk.bold("Name"), chalk.bold("Description"), chalk.bold("Params")],
        ...rows.map(([name, desc, params]) => [
          chalk.cyan(name ?? ""),
          chalk.dim(desc ?? ""),
          chalk.dim(params ?? ""),
        ]),
      ];
      printLine(table(tableData, { border: { bodyJoin: "─" } }));
    }
  }

  if (resources.length > 0) {
    printLine(CI_MODE ? "\n=== RESOURCES ===" : chalk.bold("\n Resources\n"));
    resources.forEach((r) => {
      if (CI_MODE) {
        printLine(`  ${r.name}  ${r.uri}`);
      } else {
        printLine(`  ${chalk.cyan(r.name)}  ${chalk.dim(r.uri)}`);
      }
    });
    printLine();
  }

  if (prompts.length > 0) {
    printLine(CI_MODE ? "\n=== PROMPTS ===" : chalk.bold("\n Prompts\n"));
    prompts.forEach((p) => {
      if (CI_MODE) {
        printLine(`  ${p.name}`);
      } else {
        printLine(`  ${chalk.cyan(p.name)}  ${chalk.dim(p.description ?? "")}`);
      }
    });
    printLine();
  }

  if (tools.length === 0 && resources.length === 0 && prompts.length === 0) {
    printWarning("Server exposes no tools, resources, or prompts.");
  }
}

// ─── Doctor Check Printer ──────────────────────────────────────────────────────

export function printDoctorCheck(label: string, passed: boolean, detail?: string): void {
  if (CI_MODE) {
    printLine(`${passed ? "PASS" : "FAIL"}: ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    const icon = passed ? chalk.green("✔") : chalk.red("✖");
    const labelStr = passed ? chalk.white(label) : chalk.red(label);
    printLine(`  ${icon}  ${labelStr}${detail ? chalk.dim(`  ${detail}`) : ""}`);
  }
}
