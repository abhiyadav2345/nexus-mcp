import { describe, it, expect } from "vitest";
import { E102UnderspecifiedInput } from "../../src/analyser/rules/E102-underspecified-input.js";
import type { McpTool } from "../../src/types/index.js";

function makeTool(properties: McpTool["inputSchema"]["properties"] = {}): McpTool {
  return {
    name: "test_tool",
    description: "A well-described tool",
    inputSchema: { type: "object", properties },
  };
}

describe("E102 — Underspecified Input Parameter", () => {
  it("passes when all parameters have descriptions", () => {
    const tools = [makeTool({
      userId: { type: "string", description: "The unique user ID (UUID format)" },
    })];
    expect(E102UnderspecifiedInput.check(tools)).toHaveLength(0);
  });

  it("passes when parameter has enum (no description needed)", () => {
    const tools = [makeTool({
      status: { type: "string", enum: ["active", "inactive", "pending"] },
    })];
    expect(E102UnderspecifiedInput.check(tools)).toHaveLength(0);
  });

  it("passes when parameter has format", () => {
    const tools = [makeTool({
      email: { type: "string", format: "email" },
    })];
    expect(E102UnderspecifiedInput.check(tools)).toHaveLength(0);
  });

  it("passes when parameter has examples", () => {
    const tools = [makeTool({
      query: { type: "string", examples: ["find users by name"] },
    })];
    expect(E102UnderspecifiedInput.check(tools)).toHaveLength(0);
  });

  it("flags parameter with no description, enum, format, or examples", () => {
    const tools = [makeTool({
      userId: { type: "string" },
    })];
    const findings = E102UnderspecifiedInput.check(tools);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe("E102");
    expect(findings[0]!.message).toContain("userId");
  });

  it("flags multiple underspecified parameters", () => {
    const tools = [makeTool({
      userId: { type: "string" },
      role: { type: "string" },
      goodParam: { type: "string", description: "Well described" },
    })];
    const findings = E102UnderspecifiedInput.check(tools);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("userId"),
        expect.stringContaining("role"),
      ]),
    );
  });

  it("passes when tool has no input parameters", () => {
    const tools = [makeTool({})];
    expect(E102UnderspecifiedInput.check(tools)).toHaveLength(0);
  });
});
