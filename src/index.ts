/**
 * Nexus MCP — Public Library API
 * Use this when integrating nexus-mcp programmatically.
 */

export { runAnalysis, createAnalyser } from "./analyser/index.js";
export { createTransport } from "./transport/index.js";
export type { NexusTransport, TransportOptions } from "./transport/index.js";

export type {
  McpTool,
  McpResource,
  McpPrompt,
  McpToolInputSchema,
  McpSchemaProperty,
  Finding,
  Severity,
  AnalysisResult,
  Rule,
  Result,
  NexusConfig,
  ContractFile,
  ContractTestCase,
  TransportType,
} from "./types/index.js";

export { ok, err } from "./types/index.js";
