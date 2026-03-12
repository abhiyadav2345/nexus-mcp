import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { NexusTransport, TransportOptions, ConnectionInfo } from "./types.js";
import type { McpTool, McpResource, McpPrompt, Result } from "../types/index.js";
import { ok, err } from "../types/index.js";

export class StdioTransport implements NexusTransport {
  private client: Client | null = null;
  private _isConnected = false;
  private readonly script: string;
  private readonly args: string[];
  private readonly env: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(options: TransportOptions) {
    if (!options.script) {
      throw new Error("StdioTransport requires a script option");
    }
    this.script = options.script;
    this.args = options.args ?? [];
    this.env = options.env ?? {};
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<Result<ConnectionInfo>> {
    try {
      const [command, ...scriptArgs] = this.script.split(" ");
      if (!command) {
        return err(new Error("Invalid script: empty command"));
      }

      const transport = new StdioClientTransport({
        command,
        args: [...scriptArgs, ...this.args],
        env: { ...process.env, ...this.env } as Record<string, string>,
      });

      this.client = new Client(
        { name: "nexus-mcp", version: "0.1.0" },
        { capabilities: {} },
      );

      const connectPromise = this.client.connect(transport);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Connection timed out after ${this.timeoutMs}ms`)), this.timeoutMs),
      );

      await Promise.race([connectPromise, timeoutPromise]);
      this._isConnected = true;

      const serverInfo = this.client.getServerVersion();
      const capabilities = this.client.getServerCapabilities() ?? {};

      return ok({
        serverName: serverInfo?.name,
        serverVersion: serverInfo?.version,
        protocolVersion: "2024-11-05",
        capabilities: capabilities as Record<string, unknown>,
      });
    } catch (error) {
      this._isConnected = false;
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async listTools(): Promise<Result<McpTool[]>> {
    if (!this.client || !this._isConnected) {
      return err(new Error("Not connected. Call connect() first."));
    }
    try {
      const response = await this.client.listTools();
      const tools: McpTool[] = response.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as McpTool["inputSchema"],
      }));
      return ok(tools);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async listResources(): Promise<Result<McpResource[]>> {
    if (!this.client || !this._isConnected) {
      return err(new Error("Not connected. Call connect() first."));
    }
    try {
      const response = await this.client.listResources();
      const resources: McpResource[] = response.resources.map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
      return ok(resources);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async listPrompts(): Promise<Result<McpPrompt[]>> {
    if (!this.client || !this._isConnected) {
      return err(new Error("Not connected. Call connect() first."));
    }
    try {
      const response = await this.client.listPrompts();
      const prompts: McpPrompt[] = response.prompts.map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments?.map((a) => ({
          name: a.name,
          description: a.description,
          required: a.required,
        })),
      }));
      return ok(prompts);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<Result<unknown>> {
    if (!this.client || !this._isConnected) {
      return err(new Error("Not connected. Call connect() first."));
    }
    try {
      const response = await this.client.callTool({ name, arguments: args });
      return ok(response);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore disconnect errors
      }
      this.client = null;
      this._isConnected = false;
    }
  }
}
