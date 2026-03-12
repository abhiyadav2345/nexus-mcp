import { describe, it, expect } from "vitest";
import { E500SideEffect } from "../../src/analyser/rules/E500-side-effect.js";
import type { McpTool } from "../../src/types/index.js";

function makeTool(name: string, description: string, extraSchema: Record<string, unknown> = {}): McpTool {
  return {
    name,
    description,
    inputSchema: { type: "object", properties: {}, ...extraSchema },
  };
}

describe("E500 — Undeclared Side Effect", () => {
  it("passes for read-only tools with no side effect verbs", () => {
    const tools = [makeTool("get_user", "Fetches a user record by their unique ID")];
    expect(E500SideEffect.check(tools)).toHaveLength(0);
  });

  it("passes when side effects are declared in schema", () => {
    const tools = [makeTool(
      "delete_user",
      "Permanently deletes a user account and all associated data",
      { "x-side-effects": "delete" },
    )];
    expect(E500SideEffect.check(tools)).toHaveLength(0);
  });

  it("flags 'delete' verb without declaration", () => {
    const tools = [makeTool("delete_user", "Permanently deletes a user account")];
    const findings = E500SideEffect.check(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("E500");
    expect(findings[0]!.severity).toBe("warning");
  });

  it("flags 'send' verb without declaration", () => {
    const tools = [makeTool("send_email", "Sends an email to a recipient")];
    const findings = E500SideEffect.check(tools);
    expect(findings).toHaveLength(1);
  });

  it("flags 'create' in description without declaration", () => {
    const tools = [makeTool("new_record", "Creates a new record in the database")];
    const findings = E500SideEffect.check(tools);
    expect(findings).toHaveLength(1);
  });

  it("detects verb in tool name itself", () => {
    const tools = [makeTool("update_contact", "Modifies contact details in the system")];
    const findings = E500SideEffect.check(tools);
    expect(findings).toHaveLength(1);
  });
});
