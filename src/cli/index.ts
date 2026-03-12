#!/usr/bin/env node
import { Command } from "commander";
import { registerListCommand } from "./commands/list.js";
import { registerAnalyseCommand } from "./commands/analyse.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerInitCommand } from "./commands/init.js";
import { registerTestCommand } from "./commands/test.js";
import { registerDevCommand } from "./commands/dev.js";

const program = new Command();

program
  .name("nexus")
  .description(
    "Production-grade MCP server linter, contract tester, and quality intelligence CLI",
  )
  .version("0.1.0", "-v, --version", "Print version number");

// Register all commands
registerInitCommand(program);
registerDoctorCommand(program);
registerListCommand(program);
registerAnalyseCommand(program);
registerTestCommand(program);
registerDevCommand(program);

// Default help if no command given
program.addHelpText(
  "after",
  `
Examples:
  $ nexus init
  $ nexus doctor --url http://localhost:8000/mcp
  $ nexus list --url http://localhost:8000/mcp
  $ npx @nexus-mcp/cli analyse --url http://localhost:8000/mcp
  $ nexus analyse --url http://localhost:8000/mcp --ci
  $ nexus test --url http://localhost:8000/mcp --tool get_user
`,
);

program.parse(process.argv);
