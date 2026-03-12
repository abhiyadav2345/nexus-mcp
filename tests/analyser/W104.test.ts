import { describe, it, expect } from "vitest";
import { W104GenericDescription } from "../../src/analyser/rules/W104-generic-description.js";
import type { McpTool } from "../../src/types/index.js";

function makeTool(description: string | undefined): McpTool {
  return {
    name: "test_tool",
    description,
    inputSchema: { type: "object", properties: {} },
  };
}

describe("W104 — Generic Description", () => {
  it("passes with a specific, detailed description", () => {
    const tools = [makeTool(
      "Fetches a single user record from PostgreSQL by UUID, returning name, email, role, and account status.",
    )];
    expect(W104GenericDescription.check(tools)).toHaveLength(0);
  });

  it("flags a very short description", () => {
    const tools = [makeTool("Gets user data")];
    const findings = W104GenericDescription.check(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("W104");
    expect(findings[0]!.severity).toBe("warning");
  });

  it("flags description with only generic words", () => {
    const tools = [makeTool("Fetches and retrieves data information results from the system")];
    const findings = W104GenericDescription.check(tools);
    expect(findings).toHaveLength(1);
  });

  it("skips tools with no description (E101 handles those)", () => {
    const tools = [makeTool(undefined)];
    const findings = W104GenericDescription.check(tools);
    expect(findings).toHaveLength(0);
  });

  it("passes with exactly 10+ meaningful words", () => {
    const tools = [makeTool(
      "Searches the customer database by email address and returns the matching account record",
    )];
    expect(W104GenericDescription.check(tools)).toHaveLength(0);
  });
});
