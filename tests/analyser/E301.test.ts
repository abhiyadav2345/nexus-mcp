import { describe, it, expect } from "vitest";
import { E301OutputExplosion } from "../../src/analyser/rules/E301-output-explosion.js";
import type { McpTool } from "../../src/types/index.js";

function makeTool(name: string, description: string, params: Record<string, unknown> = {}): McpTool {
  return {
    name,
    description,
    inputSchema: { type: "object", properties: params as McpTool["inputSchema"]["properties"] },
  };
}

describe("E301 — Output Explosion Risk", () => {
  it("passes when list tool has a limit parameter", () => {
    const tools = [makeTool(
      "list_users",
      "Returns a list of all users",
      { limit: { type: "number", description: "Max results to return" } },
    )];
    expect(E301OutputExplosion.check(tools)).toHaveLength(0);
  });

  it("passes when list tool has a cursor parameter", () => {
    const tools = [makeTool(
      "list_orders",
      "Fetches all orders",
      { cursor: { type: "string", description: "Pagination cursor" } },
    )];
    expect(E301OutputExplosion.check(tools)).toHaveLength(0);
  });

  it("flags list tool with no pagination params", () => {
    const tools = [makeTool("list_users", "Returns a list of all users from the database")];
    const findings = E301OutputExplosion.check(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("E301");
    expect(findings[0]!.severity).toBe("warning");
  });

  it("flags tool with 'all' in name and no pagination", () => {
    const tools = [makeTool("get_all_records", "Retrieves all records from the system")];
    const findings = E301OutputExplosion.check(tools);
    expect(findings).toHaveLength(1);
  });

  it("passes when non-list tool has no pagination (no false positives)", () => {
    const tools = [makeTool("get_user", "Returns a single user by ID")];
    expect(E301OutputExplosion.check(tools)).toHaveLength(0);
  });

  it("passes with page_size parameter", () => {
    const tools = [makeTool(
      "search_contacts",
      "Searches for contacts matching query",
      { page_size: { type: "number", description: "Results per page" } },
    )];
    expect(E301OutputExplosion.check(tools)).toHaveLength(0);
  });
});
