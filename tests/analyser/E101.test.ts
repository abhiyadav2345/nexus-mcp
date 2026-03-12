import { describe, it, expect } from "vitest";
import { E101MissingDescription } from "../../src/analyser/rules/E101-missing-description.js";
import type { McpTool } from "../../src/types/index.js";

function makeTool(overrides: Partial<McpTool> = {}): McpTool {
  return {
    name: "test_tool",
    description: "A test tool that does something specific and returns data.",
    inputSchema: { type: "object", properties: {} },
    ...overrides,
  };
}

describe("E101 — Missing Tool Description", () => {
  it("passes when tool has a good description", () => {
    const tools = [makeTool()];
    const findings = E101MissingDescription.check(tools);
    expect(findings).toHaveLength(0);
  });

  it("flags when description is undefined", () => {
    const tools = [makeTool({ description: undefined })];
    const findings = E101MissingDescription.check(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("E101");
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.toolName).toBe("test_tool");
  });

  it("flags when description is empty string", () => {
    const tools = [makeTool({ description: "" })];
    const findings = E101MissingDescription.check(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("E101");
  });

  it("flags when description is only whitespace", () => {
    const tools = [makeTool({ description: "   \n\t  " })];
    const findings = E101MissingDescription.check(tools);
    expect(findings).toHaveLength(1);
  });

  it("flags multiple tools missing descriptions", () => {
    const tools = [
      makeTool({ name: "tool_a", description: undefined }),
      makeTool({ name: "tool_b", description: "Good description here for this tool" }),
      makeTool({ name: "tool_c", description: "" }),
    ];
    const findings = E101MissingDescription.check(tools);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.toolName)).toEqual(["tool_a", "tool_c"]);
  });

  it("returns empty array for empty tools list", () => {
    const findings = E101MissingDescription.check([]);
    expect(findings).toHaveLength(0);
  });
});
