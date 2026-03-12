# PRD — Nexus MCP CLI
## Product Requirements Document v1.0

---

## 1. Overview

**Product:** Nexus MCP CLI (`@nexus-mcp/cli`)
**Owner:** Abhishek Yadav
**Status:** Phase 0 — Active Development
**Target Release:** v0.1.0 (MVP)

Nexus MCP is a command-line tool that acts as a linter, contract tester, and quality intelligence layer for Model Context Protocol (MCP) servers. It catches broken tool definitions before they cause silent AI agent failures in production.

---

## 2. Problem Statement

MCP is how AI agents call external tools. When tool definitions are broken, agents fail silently — no obvious error, just wrong behavior. The three most common failure modes:

1. **Vague tool descriptions** → LLM picks the wrong tool or doesn't call one at all
2. **Missing/wrong parameter schemas** → LLM hallucinates parameters that don't exist
3. **No output constraints** → Tool returns 12MB of JSON and blows the context window

There is no standard tooling to catch these issues. Syrin (the closest competitor) is early-stage, CLI-only, has 44 GitHub stars, no community, and no production observability. This is a wide-open market.

---

## 3. Goals

### Phase 0 Goals (Current)
- Ship a working CLI that is better than Syrin on every dimension it covers
- Zero-config entry point: works with just `--url` pointing at an MCP server
- Full CI/CD integration with structured exit codes
- 6 analysis rules covering the most impactful failure modes
- Contract testing system with YAML-defined behavioral guarantees
- 1,000+ npm downloads/week within 8 weeks of launch

### Non-Goals (Phase 0)
- Web dashboard (Phase 2)
- Production observability SDK (Phase 1)
- Team collaboration features (Phase 2)
- Security scanning (Phase 3)
- LLM-powered dev mode (Phase 1)

---

## 4. User Stories

### US-001: Zero-Config Analysis
> As an AI engineer, I want to run `npx @nexus-mcp/cli analyse --url http://localhost:8000/mcp` and instantly get a list of problems with my MCP server's tool definitions, so I can fix them before deploying.

**Acceptance Criteria:**
- Command works with zero setup (no config file, no installation required)
- Output lists each finding with: error code, tool name, message, and fix suggestion
- Exit code 0 if no errors found, exit code 1 if errors found
- Runs in under 5 seconds for a server with up to 50 tools

---

### US-002: CI/CD Integration
> As a DevOps engineer, I want to add `nexus analyse --ci` to my GitHub Actions pipeline so that deployments are blocked when MCP tool definitions are broken.

**Acceptance Criteria:**
- `--ci` flag produces plain text output (no ANSI colors, no spinners)
- Structured exit codes: 0 = pass, 1 = analysis errors found, 2 = connection failure
- GitHub Actions example workflow included in docs
- Can be run with zero installed dependencies via `npx`

---

### US-003: Tool Listing
> As a developer, I want to run `nexus list` to see all tools, resources, and prompts my MCP server exposes, so I can quickly audit what's available.

**Acceptance Criteria:**
- Outputs a clean table showing tool name, description (truncated), and parameter count
- Groups output by: Tools / Resources / Prompts
- Works with both HTTP and stdio transports
- Supports `--json` flag for machine-readable output

---

### US-004: Contract Testing
> As an AI engineer, I want to define behavioral contracts for my MCP tools in YAML files and run `nexus test` to verify they still behave correctly after any change.

**Acceptance Criteria:**
- YAML contract files in `./tools/<tool-name>.yaml`
- Each contract can define: valid inputs, expected output fields, invalid inputs, max output size
- `nexus test` runs all contracts and reports pass/fail per test case
- `nexus test --tool fetch_user` runs only that tool's contract
- Failed test cases show: input sent, actual output received, expected output

---

### US-005: Connection Validation
> As a developer, I want to run `nexus doctor` to verify my nexus.yaml config is valid and my MCP server is reachable before running other commands.

**Acceptance Criteria:**
- Checks: config file exists and is valid YAML, server is reachable, protocol handshake succeeds
- Each check shows ✅ or ❌ with an explanation
- Suggests fixes for common failures (wrong URL, wrong transport, server not running)

---

### US-006: Project Initialization
> As a developer, I want to run `nexus init` in my project to get a starter nexus.yaml and tools/ directory scaffolded for me.

**Acceptance Criteria:**
- Creates `nexus.yaml` with all options documented as comments
- Creates `tools/` directory with a `_example.yaml` contract template
- Does not overwrite existing files (asks for confirmation)
- Detects if there's already a running MCP server and pre-fills the URL

---

## 5. Functional Requirements

### 5.1 CLI Commands

#### `nexus init`
- Scaffolds `nexus.yaml` + `tools/` directory
- Flags: `--force` (overwrite existing)

#### `nexus list`
- Lists all tools, resources, and prompts from MCP server
- Flags: `--url <url>`, `--script <path>`, `--transport http|stdio`, `--json`

#### `nexus doctor`
- Validates config + connection
- Flags: `--url <url>`, `--script <path>`, `--config <path>`

#### `nexus analyse`
- Runs static analysis on tool definitions
- Flags: `--url <url>`, `--script <path>`, `--transport http|stdio`, `--ci`, `--json`, `--config <path>`, `--ignore <codes>`
- Reads from `nexus.yaml` if present, flags override config

#### `nexus test`
- Runs contract tests
- Flags: `--url <url>`, `--script <path>`, `--transport http|stdio`, `--tool <name>`, `--ci`, `--strict`, `--connection` (connection-only, no execution)

#### `nexus dev`
- Interactive LLM-MCP session (Phase 0: scaffold only, shows "coming in v0.2.0")
- Flags: `--exec`, `--llm openai|claude|ollama`, `--save-events`

---

### 5.2 Analysis Rules

#### E101 — Missing Tool Description
- **Trigger:** `tool.description` is undefined, null, empty string, or only whitespace
- **Severity:** Error
- **Message:** `Tool "${name}" has no description. The LLM cannot know when to use it.`
- **Suggestion:** Add a description explaining: (1) what the tool does, (2) when to use it, (3) what it returns.

#### E102 — Underspecified Input Parameter
- **Trigger:** Any parameter in `inputSchema.properties` that lacks ALL of: `description`, `enum`, `format`, `examples`
- **Severity:** Error
- **Message:** `Parameter "${param}" in tool "${name}" has no description or constraints. The LLM may hallucinate values.`
- **Suggestion:** Add a `description` field explaining what this parameter expects.

#### E110 — Tool Ambiguity
- **Trigger:** Two tools where keyword overlap between their descriptions exceeds 80% (after stripping stop words)
- **Severity:** Error
- **Message:** `Tools "${nameA}" and "${nameB}" have similar descriptions (${score}% overlap). The LLM may pick randomly.`
- **Suggestion:** Differentiate descriptions by specifying exactly when to use each one over the other.

#### W104 — Generic Description
- **Trigger:** Tool description is fewer than 10 words, OR description only contains generic words (gets, fetches, retrieves, data, information, the, a)
- **Severity:** Warning
- **Message:** `Tool "${name}" has a generic description: "${description}". This may cause poor tool selection.`
- **Suggestion:** Describe what specifically distinguishes this tool's purpose, input requirements, and output format.

#### E301 — Output Explosion Risk
- **Trigger:** Tool name/description implies it returns a list/collection AND has no `limit`, `max`, `page`, or `cursor` parameter
- **Severity:** Warning
- **Message:** `Tool "${name}" may return an unbounded list without pagination. This could overflow the LLM context window.`
- **Suggestion:** Add a `limit` parameter (e.g., `max: 50`) or document the maximum response size.

#### E500 — Undeclared Side Effect
- **Trigger:** Tool name or description contains write/mutate/delete/update/create/remove/send/post verbs, but no `sideEffects` or `readonly` field in schema annotations
- **Severity:** Warning
- **Message:** `Tool "${name}" appears to have side effects but doesn't declare them. The LLM may call it unexpectedly.`
- **Suggestion:** Add a `x-side-effects` annotation to the schema, or make the side effects explicit in the description.

---

### 5.3 Contract File Format

Location: `tools/<tool-name>.yaml`

```yaml
# tools/get_user.yaml
tool: get_user
description: "Fetches a user by their unique ID"
sideEffects: none
maxOutputBytes: 10240

testCases:
  - name: "valid user ID"
    input:
      userId: "user_123"
    expect:
      status: success
      fields: [id, name, email, createdAt]

  - name: "empty user ID should fail"
    input:
      userId: ""
    expect:
      status: error

  - name: "nonexistent user"
    input:
      userId: "does_not_exist_999"
    expect:
      status: error
      messageContains: "not found"
```

---

### 5.4 Configuration File Format

Location: `nexus.yaml` (project root)

```yaml
version: 1

server:
  transport: http
  url: http://localhost:8000/mcp
  # script: node server.js    # use this for stdio transport
  timeout: 10000               # ms, default 10s

analysis:
  rules:
    ignore: []                 # e.g. ["W104"] to disable a rule
  thresholds:
    ambiguityOverlapPercent: 80   # E110 trigger threshold

contracts:
  dir: ./tools
```

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Cold start (npx, first run) | < 3 seconds |
| Analysis time (50 tools) | < 2 seconds |
| Memory usage | < 100MB peak |
| Node.js minimum | 20.12.0 |
| TypeScript strict mode | Always |
| Test coverage | > 80% for analyser rules |
| Zero required config | Commands must work with just --url |

---

## 7. Technical Constraints

- **ESM only.** The project uses `"type": "module"` throughout. No CommonJS.
- **No native dependencies.** Must install cleanly on macOS, Linux, and Windows without compilation.
- **No required API keys.** The CLI must work without any cloud service accounts. (Future LLM dev mode will support keys optionally.)
- **MCP SDK parity.** Always use the official `@modelcontextprotocol/sdk` for protocol communication. Never hand-roll the protocol.

---

## 8. Roadmap

### v0.1.0 — MVP (Current Sprint)
- [ ] All 6 CLI commands (init, list, doctor, analyse, test, dev-stub)
- [ ] 6 analysis rules (E101, E102, E110, W104, E301, E500)
- [ ] HTTP + stdio transports
- [ ] Contract YAML parser + basic test runner
- [ ] Colored terminal output + CI mode
- [ ] Demo MCP server example
- [ ] README with quickstart

### v0.2.0 — Quality & DX
- [ ] E105: Free text propagation detection
- [ ] `nexus dev` with real LLM integration (OpenAI + Ollama)
- [ ] `--json` output flag on all commands
- [ ] `nexus analyse --watch` — re-run on file changes
- [ ] Rule severity overrides in config
- [ ] VS Code extension (basic: show findings inline)

### v0.3.0 — Contract Power
- [ ] Property-based fuzzing in contract tests (fast-check)
- [ ] Response drift detection (compare against previous run snapshots)
- [ ] `nexus test --generate` — auto-generate contract stubs from live server
- [ ] Multiple MCP server support in one config

### v0.4.0 — Observability Alpha
- [ ] `nexus-sdk` package: lightweight Node.js instrumentation
- [ ] Event log format (JSON lines) for traces
- [ ] `nexus replay` — replay a saved event log

### v1.0.0 — Platform Foundation
- [ ] Stable public API (programmatic use as a library)
- [ ] Plugin interface for custom rules
- [ ] nexus.cloud beta (web dashboard, team features)

---

## 9. Actionable Task Breakdown (Sprint 1)

### Infrastructure Tasks
| # | Task | Est | Owner |
|---|------|-----|-------|
| I-1 | Set up GitHub repository with branch protection | 30m | Abhishek |
| I-2 | Configure GitHub Actions: lint + typecheck + test on push | 1h | Abhishek |
| I-3 | Set up Changesets for versioning + CHANGELOG | 30m | Abhishek |
| I-4 | Configure npm publish workflow (publish on tag) | 30m | Abhishek |

### Core Implementation Tasks
| # | Task | Est | File |
|---|------|-----|------|
| C-1 | Define all shared types | 1h | `src/types/index.ts` |
| C-2 | Implement NexusTransport interface | 30m | `src/transport/types.ts` |
| C-3 | Implement HTTP transport | 2h | `src/transport/http.ts` |
| C-4 | Implement stdio transport | 2h | `src/transport/stdio.ts` |
| C-5 | Transport factory function | 30m | `src/transport/index.ts` |
| C-6 | Implement Rule interface + analyser orchestrator | 1h | `src/analyser/index.ts` |
| C-7 | E101: Missing description rule | 1h | `src/analyser/rules/E101*.ts` |
| C-8 | E102: Underspecified input rule | 1h | `src/analyser/rules/E102*.ts` |
| C-9 | E110: Tool ambiguity rule | 2h | `src/analyser/rules/E110*.ts` |
| C-10 | W104: Generic description rule | 1h | `src/analyser/rules/W104*.ts` |
| C-11 | E301: Output explosion rule | 1h | `src/analyser/rules/E301*.ts` |
| C-12 | E500: Side effect detection rule | 1h | `src/analyser/rules/E500*.ts` |
| C-13 | Contract YAML parser | 2h | `src/contracts/parser.ts` |
| C-14 | Contract test runner | 3h | `src/contracts/runner.ts` |

### CLI Tasks
| # | Task | Est | File |
|---|------|-----|------|
| L-1 | Output formatter (chalk + table + boxen) | 2h | `src/cli/utils/output.ts` |
| L-2 | Logger (verbose/debug mode) | 30m | `src/cli/utils/logger.ts` |
| L-3 | Main CLI entry point (commander setup) | 1h | `src/cli/index.ts` |
| L-4 | `nexus init` command | 1h | `src/cli/commands/init.ts` |
| L-5 | `nexus list` command | 1h | `src/cli/commands/list.ts` |
| L-6 | `nexus doctor` command | 1h | `src/cli/commands/doctor.ts` |
| L-7 | `nexus analyse` command | 1h | `src/cli/commands/analyse.ts` |
| L-8 | `nexus test` command | 2h | `src/cli/commands/test.ts` |
| L-9 | `nexus dev` stub command | 30m | `src/cli/commands/dev.ts` |

### Testing Tasks
| # | Task | Est | File |
|---|------|-----|------|
| T-1 | Unit tests: E101 rule | 30m | `tests/analyser/E101.test.ts` |
| T-2 | Unit tests: E102 rule | 30m | `tests/analyser/E102.test.ts` |
| T-3 | Unit tests: E110 rule | 1h | `tests/analyser/E110.test.ts` |
| T-4 | Unit tests: W104 rule | 30m | `tests/analyser/W104.test.ts` |
| T-5 | Unit tests: E301 rule | 30m | `tests/analyser/E301.test.ts` |
| T-6 | Unit tests: E500 rule | 30m | `tests/analyser/E500.test.ts` |
| T-7 | Unit tests: contract parser | 1h | `tests/contracts/parser.test.ts` |

### Documentation Tasks
| # | Task | Est | File |
|---|------|-----|------|
| D-1 | README with quickstart + example output | 2h | `README.md` |
| D-2 | Demo MCP server (with intentional mistakes) | 1h | `examples/demo-server/` |
| D-3 | GitHub Actions example workflow | 30m | `docs/ci-integration.md` |

---

## 10. Success Definition for v0.1.0

The v0.1.0 release is successful when:

1. `npx @nexus-mcp/cli analyse --url http://localhost:8000/mcp` works in under 3 seconds on a fresh machine
2. All 6 rules catch their intended issues against the demo server
3. `nexus test` runs a contract YAML and reports pass/fail correctly
4. All 7 analysis rule unit tests pass with >80% coverage
5. The build produces a clean `dist/` with no TypeScript errors
6. Published to npm as `@nexus-mcp/cli`
