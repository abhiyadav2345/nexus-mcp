import { describe, it, expect } from "vitest";
import { createE110Rule, E110ToolAmbiguity } from "../../src/analyser/rules/E110-tool-ambiguity.js";
import type { McpTool } from "../../src/types/index.js";

function makeTool(name: string, description: string): McpTool {
  return {
    name,
    description,
    inputSchema: { type: "object", properties: {} },
  };
}

describe("E110 — Tool Ambiguity", () => {
  it("passes when tools have clearly different descriptions", () => {
    const tools = [
      makeTool("get_user", "Fetches a single user record from the database by their unique UUID"),
      makeTool("send_email", "Sends a transactional email to a recipient address via SMTP"),
    ];
    expect(E110ToolAmbiguity.check(tools)).toHaveLength(0);
  });

  it("flags two tools with near-identical descriptions", () => {
    const tools = [
      makeTool("get_contact", "Fetches contact information including name email phone from CRM"),
      makeTool("fetch_contact", "Fetches contact information including name email phone from CRM database"),
    ];
    const findings = E110ToolAmbiguity.check(tools);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]!.code).toBe("E110");
    expect(findings[0]!.severity).toBe("error");
  });

  it("flags tools with high keyword overlap", () => {
    const tools = [
      makeTool("list_users", "Returns list of all users from the users table in database"),
      makeTool("get_users", "Returns list of all users from the users table in database system"),
    ];
    const findings = E110ToolAmbiguity.check(tools);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("respects custom threshold — lower threshold catches more ambiguity", () => {
    const strictRule = createE110Rule(50);
    const tools = [
      makeTool("search_users", "Searches users by name in the system"),
      makeTool("filter_users", "Filters users by name in the system"),
    ];
    const strictFindings = strictRule.check(tools);
    const defaultFindings = E110ToolAmbiguity.check(tools);
    // Strict (50%) should catch this, default (80%) may not
    expect(strictFindings.length).toBeGreaterThanOrEqual(defaultFindings.length);
  });

  it("passes with only one tool", () => {
    const tools = [makeTool("get_user", "Fetches a single user from the database")];
    expect(E110ToolAmbiguity.check(tools)).toHaveLength(0);
  });

  it("skips tools without descriptions (E101 handles those)", () => {
    const tools = [
      makeTool("tool_a", ""),
      makeTool("tool_b", ""),
    ];
    // Tools without descriptions shouldn't trigger E110 (E101 already flags them)
    const findings = E110ToolAmbiguity.check(tools);
    expect(findings).toHaveLength(0);
  });
});
