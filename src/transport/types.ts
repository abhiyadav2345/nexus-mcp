import type { McpTool, McpResource, McpPrompt, Result } from "../types/index.js";

export type TransportOptions = {
  url?: string;
  script?: string;
  args?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
};

export type ConnectionInfo = {
  serverName?: string;
  serverVersion?: string;
  protocolVersion: string;
  capabilities: Record<string, unknown>;
};

export interface NexusTransport {
  connect(): Promise<Result<ConnectionInfo>>;
  listTools(): Promise<Result<McpTool[]>>;
  listResources(): Promise<Result<McpResource[]>>;
  listPrompts(): Promise<Result<McpPrompt[]>>;
  callTool(name: string, args: Record<string, unknown>): Promise<Result<unknown>>;
  disconnect(): Promise<void>;
  readonly isConnected: boolean;
}
