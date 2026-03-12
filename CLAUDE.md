# CLAUDE.md — Nexus MCP CLI

> This file is the single source of truth for any AI coding assistant working on this codebase.
> Read this entire file before writing any code. Every section matters.

---

## What Is This Product?

**Nexus MCP** is a production-grade CLI tool that acts as a linter, contract tester, and quality intelligence layer for **Model Context Protocol (MCP) servers**.

MCP is the protocol that lets AI agents call external tools (read files, query databases, call APIs). When tool definitions are broken — vague descriptions, missing schemas, ambiguous names, oversized outputs — AI agents fail silently. Nexus catches these failures **before they reach production**.

**Target users:** AI engineers, AI agency owners managing multiple clients' AI agents, and DevOps teams running MCP servers in CI/CD.

**One-line pitch:** "ESLint for your AI agents' tools."

---

## Product Vision

Nexus MCP CLI (`@nexus-mcp/cli`) is **Phase 0** of a larger platform:

- **Phase 0 (current):** CLI — linter + contract tester + dev mode. Open-source, drop-in Syrin replacement.
- **Phase 1:** Production observability SDK — traces real LLM-tool calls in prod.
- **Phase 2:** Web dashboard — multi-client agency management, team collaboration, tool registry.
- **Phase 3:** Security scanning, enterprise governance, plugin marketplace.

We are building Phase 0 now. Every architectural decision must support Phase 1+ without requiring rewrites.

---

## Architecture Overview

```
nexus-mcp/
├── src/
│   ├── cli/                    # CLI entry point and commands
│   │   ├── index.ts            # Main CLI, registers all commands
│   │   └── commands/           # One file per CLI command
│   │       ├── analyse.ts      # Static analysis (no execution)
│   │       ├── test.ts         # Contract-based functional testing
│   │       ├── list.ts         # List tools/resources/prompts
│   │       ├── dev.ts          # Interactive LLM-MCP dev session
│   │       ├── doctor.ts       # Config + connection validation
│   │       └── init.ts         # Scaffold nexus.yaml + tools/ dir
│   ├── analyser/               # Core static analysis engine
│   │   ├── index.ts            # Orchestrates all rules, returns findings
│   │   ├── types.ts            # Finding, Rule, Severity types
│   │   └── rules/              # One file per error/warning rule
│   │       ├── E101-missing-description.ts
│   │       ├── E102-underspecified-input.ts
│   │       ├── E105-free-text-propagation.ts
│   │       ├── E110-tool-ambiguity.ts
│   │       ├── E301-output-explosion.ts
│   │       ├── E500-side-effect.ts
│   │       └── W104-generic-description.ts
│   ├── transport/              # MCP connection layer
│   │   ├── index.ts            # Factory: create transport from options
│   │   ├── http.ts             # HTTP/SSE transport
│   │   ├── stdio.ts            # stdio transport (script-based)
│   │   └── types.ts            # Transport interface + options
│   ├── contracts/              # Contract testing engine
│   │   ├── index.ts            # Run contracts against live server
│   │   ├── parser.ts           # Parse tools/*.yaml contract files
│   │   └── runner.ts           # Execute test cases, compare results
│   ├── types/
│   │   └── index.ts            # Shared types used across modules
│   └── index.ts                # Public library exports (for SDK use)
├── tests/
│   ├── analyser/               # Unit tests for every rule
│   └── contracts/              # Unit tests for contract parser/runner
├── examples/
│   └── demo-server/            # A real MCP server for testing
├── CLAUDE.md                   # ← You are here
└── PRD.md                      # Full product requirements
```

---

## Core Concepts

### 1. Tool Definition (MCP)
An MCP tool has three fields the LLM uses:
```typescript
{
  name: string;          // What the LLM calls when it wants to use this tool
  description: string;   // Natural language — the LLM reads this to decide WHEN to use it
  inputSchema: {         // JSON Schema — defines what parameters to pass
    type: "object";
    properties: Record<string, { type: string; description?: string; ... }>;
    required?: string[];
  }
}
```
ALL our analysis rules operate on these three fields. Never forget: the LLM reads `description` and `inputSchema` — not the implementation.

### 2. Finding (Analysis Result)
Every rule emits zero or more `Finding` objects:
```typescript
interface Finding {
  code: string;           // "E101", "W104", etc.
  severity: "error" | "warning" | "info";
  toolName: string;       // Which tool triggered this
  message: string;        // Human-readable explanation
  suggestion: string;     // Concrete fix the developer should make
  docs?: string;          // Link to docs page for this error code
}
```

### 3. Rule Interface
Every analysis rule must implement:
```typescript
interface Rule {
  code: string;
  name: string;
  description: string;
  check(tools: McpTool[], resources?: McpResource[]): Finding[];
}
```
Rules are **pure functions** — they receive tool definitions and return findings. No side effects. No async. Fully testable.

### 4. Transport Layer
All commands that need a live MCP server go through the transport layer:
```typescript
interface NexusTransport {
  connect(): Promise<void>;
  listTools(): Promise<McpTool[]>;
  listResources(): Promise<McpResource[]>;
  listPrompts(): Promise<McpPrompt[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  disconnect(): Promise<void>;
}
```
Transport type is determined by CLI flags: `--transport http|stdio` + `--url` or `--script`.

### 5. Error Code Taxonomy
| Code | Severity | Trigger Condition |
|------|----------|-------------------|
| E101 | error    | Tool has no `description` field or it is empty |
| E102 | error    | A parameter has no `description`, no `enum`, no `format`, no `example` |
| E105 | error    | A string output from tool A flows unconstrained into tool B's input |
| E110 | error    | Two tools have descriptions with >80% keyword overlap |
| E301 | warning  | Tool has no pagination, no `limit` param, and returns an array type |
| E500 | warning  | Tool name/description contains write/delete/update verbs without `sideEffects` declaration |
| W104 | warning  | Tool description is <10 words or contains only generic words |

---

## Coding Conventions

### TypeScript
- **Strict mode always.** `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`
- **No `any`.** Use `unknown` and narrow it. If you truly need escape hatches, use `// eslint-disable-next-line` with a comment explaining why.
- **Prefer `type` over `interface`** for data shapes. Use `interface` only for things that get implemented (e.g., `Rule`, `NexusTransport`).
- **Zod for all external data.** Any data coming from MCP servers, YAML files, or user config must go through a Zod schema before use.
- **Named exports only.** No default exports except in CLI entry point.

### File Structure
- One concern per file. A rule file only contains one rule. A command file only contains one command.
- Keep files under 200 lines. If a file is growing beyond that, split it.
- Co-locate tests: `tests/analyser/E101.test.ts` mirrors `src/analyser/rules/E101-missing-description.ts`

### Error Handling
- **Never throw raw errors to the user.** All CLI commands catch errors and display them via the formatter with a helpful message.
- Use `Result<T, E>` pattern for operations that can fail gracefully:
  ```typescript
  type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
  ```
- MCP connection errors must tell the user exactly what to check (URL wrong? Server not running? Wrong transport?).

### CLI Output
- All output goes through `src/cli/utils/output.ts` — never `console.log` directly in commands.
- **Colors:** errors = red, warnings = yellow, info = blue, success = green (using chalk).
- **CI mode:** when `--ci` flag is passed, output is plain text (no colors, no spinners) for machine readability.
- Exit codes: `0` = success, `1` = errors found, `2` = connection/config failure.

### Testing
- Every rule must have unit tests covering: (a) the happy path (no findings), (b) each finding case it can emit.
- Use `vitest` with `describe/it/expect` — no external test doubles library needed.
- Tests must not make network calls. Use mock tool definitions inline.

---

## Adding a New Analysis Rule

1. Create `src/analyser/rules/EXXX-rule-name.ts`
2. Implement the `Rule` interface (see Core Concepts above)
3. Export the rule instance as a named export
4. Register it in `src/analyser/index.ts` (the `ALL_RULES` array)
5. Write tests in `tests/analyser/EXXX-rule-name.test.ts`
6. Add the error code to the taxonomy table in this file

Example rule skeleton:
```typescript
// src/analyser/rules/E999-example-rule.ts
import type { Rule, Finding } from "../types.js";
import type { McpTool } from "../../types/index.js";

export const E999ExampleRule: Rule = {
  code: "E999",
  name: "Example Rule",
  description: "Detects an example problem in tool definitions.",
  check(tools: McpTool[]): Finding[] {
    const findings: Finding[] = [];
    for (const tool of tools) {
      if (/* condition */) {
        findings.push({
          code: "E999",
          severity: "error",
          toolName: tool.name,
          message: `Tool "${tool.name}" has the example problem.`,
          suggestion: "Fix it by doing X.",
        });
      }
    }
    return findings;
  },
};
```

---

## Key Dependencies & Why We Chose Them

| Package | Purpose | Why This One |
|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | Connect to MCP servers | Official Anthropic SDK — protocol parity guaranteed |
| `commander` | CLI argument parsing | Battle-tested, TypeScript-first, used by most major CLIs |
| `chalk` | Terminal colors | Universal, tree-shakeable, ESM-native in v5 |
| `ora` | Spinners for async ops | Lightweight, works well with chalk |
| `yaml` | Parse contract YAML files | Standards-compliant, safer than js-yaml |
| `zod` | Schema validation | Type-safe, great error messages, we use it everywhere |
| `fast-check` | Property-based testing | For fuzzing contract test inputs in Phase 0+ |
| `boxen` | Boxed terminal output | Clean summary displays |
| `table` | ASCII tables in terminal | Consistent tabular output for analyse results |

---

## Environment & Configuration

Config file: `nexus.yaml` in project root (created by `nexus init`).

```yaml
# nexus.yaml
version: 1
server:
  transport: http          # http | stdio
  url: http://localhost:8000/mcp    # for http transport
  # script: node server.js         # for stdio transport

analysis:
  rules:
    ignore: []             # e.g., ["W104"] to disable a rule
    overrides: {}          # per-tool overrides

contracts:
  dir: ./tools             # where .yaml contract files live
```

The CLI reads `nexus.yaml` automatically. All values can be overridden by CLI flags.

---

## Phase 0 — Implementation Checklist

These are the exact tasks to complete for the v0.1.0 release:

### Infrastructure
- [x] Project scaffold (package.json, tsconfig, tsup, vitest, eslint)
- [x] CLAUDE.md
- [x] PRD.md
- [ ] GitHub Actions CI (lint + typecheck + test on push)
- [ ] Changesets for versioning

### Core Types (`src/types/index.ts`)
- [ ] `McpTool`, `McpResource`, `McpPrompt` types (from MCP SDK)
- [ ] `Finding`, `Severity`, `AnalysisResult` types
- [ ] `NexusConfig` type (matches nexus.yaml schema)
- [ ] `ContractFile`, `TestCase` types

### Transport Layer (`src/transport/`)
- [ ] `NexusTransport` interface
- [ ] HTTP transport implementation
- [ ] stdio transport implementation
- [ ] Transport factory function

### Analysis Engine (`src/analyser/`)
- [ ] `Rule` interface
- [ ] E101: Missing description
- [ ] E102: Underspecified input
- [ ] E110: Tool ambiguity (keyword overlap)
- [ ] W104: Generic description
- [ ] E301: Output explosion risk
- [ ] E500: Side effect detection
- [ ] Analyser orchestrator (runs all rules, collects findings)

### CLI Commands (`src/cli/commands/`)
- [ ] `nexus init` — scaffold nexus.yaml + tools/ dir
- [ ] `nexus list` — list all tools/resources/prompts
- [ ] `nexus doctor` — validate config + test connection
- [ ] `nexus analyse` — run static analysis, print findings
- [ ] `nexus test` — run contract tests (Phase 0: basic version)
- [ ] `nexus dev` — interactive LLM-MCP session (Phase 0: stub)

### Output Formatting (`src/cli/utils/`)
- [ ] `output.ts` — all print functions (error, warning, success, table, box)
- [ ] `logger.ts` — verbose/debug logging behind `--verbose` flag

### Tests
- [ ] Unit tests for all 6 analysis rules
- [ ] Unit test for transport factory
- [ ] Integration test using demo-server

### Examples
- [ ] `examples/demo-server/` — a simple broken MCP server for demos

---

## What NOT to Build in Phase 0

- No web dashboard, no backend API
- No database, no persistence layer
- No user accounts, no auth
- No telemetry (add opt-in in Phase 1)
- No `nexus dev` LLM features (just scaffold the command with a "coming soon" message)
- No E105 rule implementation yet (it requires cross-tool analysis that needs more design)

---

## Commit Message Format

```
type(scope): short description

Types: feat | fix | refactor | test | docs | chore | ci
Scopes: analyser | transport | contracts | cli | types | deps

Examples:
feat(analyser): add E110 tool ambiguity detection rule
fix(transport): handle connection timeout gracefully
test(analyser): add E101 edge cases for empty string description
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Build
npm run build

# Run the CLI against a live MCP server
node dist/cli/index.js analyse --transport http --url http://localhost:8000/mcp

# Or link for global use during development
npm link
nexus analyse --transport http --url http://localhost:8000/mcp

# Run tests
npm test

# Watch mode
npm run test:watch
```

---

## Contact & Context

- **Owner:** Abhishek Yadav (abhiyadav2345@gmail.com)
- **Phase 0 goal:** Ship a working CLI that is better than Syrin on every dimension it currently covers.
- **Success metric:** 1,000+ npm downloads/week within 8 weeks of launch.
