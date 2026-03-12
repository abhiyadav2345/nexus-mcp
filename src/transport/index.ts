import type { NexusTransport, TransportOptions } from "./types.js";
import { HttpTransport } from "./http.js";
import { StdioTransport } from "./stdio.js";
import type { TransportType } from "../types/index.js";

export function createTransport(
  type: TransportType,
  options: TransportOptions,
): NexusTransport {
  switch (type) {
    case "http":
      return new HttpTransport(options);
    case "stdio":
      return new StdioTransport(options);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown transport type: ${String(_exhaustive)}`);
    }
  }
}

export type { NexusTransport, TransportOptions, ConnectionInfo } from "./types.js";
export { HttpTransport } from "./http.js";
export { StdioTransport } from "./stdio.js";
