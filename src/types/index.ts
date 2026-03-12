/**
 * Core shared types for Nexus MCP CLI.
 * All MCP protocol types are derived from or compatible with @modelcontextprotocol/sdk.
 */

// ─── MCP Protocol Types ────────────────────────────────────────────────────────

export type McpToolInputSchema = {
  type: "object";
  properties?: Record<string, McpSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
};

export type McpSchemaProperty = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  format?: string;
  examples?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: McpSchemaProperty;
  "x-side-effects"?: string;
  default?: unknown;
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema: McpToolInputSchema;
};

export type McpResource = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export type McpPrompt = {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
};

// ─── Analysis Types ────────────────────────────────────────────────────────────

export type Severity = "error" | "warning" | "info";

export type Finding = {
  code: string;
  severity: Severity;
  toolName: string;
  message: string;
  suggestion: string;
  docs?: string;
};

export type AnalysisResult = {
  serverUrl: string;
  toolCount: number;
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  durationMs: number;
};

// ─── Rule Interface ────────────────────────────────────────────────────────────

export interface Rule {
  code: string;
  name: string;
  description: string;
  check(tools: McpTool[], resources?: McpResource[]): Finding[];
}

// ─── Result Type ───────────────────────────────────────────────────────────────

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─── Config Types ──────────────────────────────────────────────────────────────

export type TransportType = "http" | "stdio";

export type ServerConfig = {
  transport: TransportType;
  url?: string;
  script?: string;
  timeout: number;
};

export type AnalysisConfig = {
  rules: {
    ignore: string[];
  };
  thresholds: {
    ambiguityOverlapPercent: number;
  };
};

export type ContractsConfig = {
  dir: string;
};

export type NexusConfig = {
  version: 1;
  server: ServerConfig;
  analysis: AnalysisConfig;
  contracts: ContractsConfig;
};

export const DEFAULT_CONFIG: NexusConfig = {
  version: 1,
  server: {
    transport: "http",
    url: "http://localhost:8000/mcp",
    timeout: 10000,
  },
  analysis: {
    rules: { ignore: [] },
    thresholds: { ambiguityOverlapPercent: 80 },
  },
  contracts: {
    dir: "./tools",
  },
};

// ─── Contract Types ────────────────────────────────────────────────────────────

export type ContractTestCase = {
  name: string;
  input: Record<string, unknown>;
  expect: {
    status?: "success" | "error";
    fields?: string[];
    messageContains?: string;
    maxBytes?: number;
  };
};

export type ContractFile = {
  tool: string;
  description?: string;
  sideEffects?: "none" | "read" | "write" | "delete";
  maxOutputBytes?: number;
  testCases: ContractTestCase[];
};

export type ContractTestResult = {
  toolName: string;
  caseName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  actual?: unknown;
};

// ─── CLI Option Types ──────────────────────────────────────────────────────────

export type CommonOptions = {
  url?: string;
  script?: string;
  transport: TransportType;
  config?: string;
  verbose?: boolean;
};

export type AnalyseOptions = CommonOptions & {
  ci?: boolean;
  json?: boolean;
  ignore?: string;
};

export type TestOptions = CommonOptions & {
  tool?: string;
  ci?: boolean;
  strict?: boolean;
  connection?: boolean;
};

export type ListOptions = CommonOptions & {
  json?: boolean;
};
