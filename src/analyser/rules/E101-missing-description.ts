import type { Rule, Finding, McpTool } from "../../types/index.js";

export const E101MissingDescription: Rule = {
  code: "E101",
  name: "Missing Tool Description",
  description: "Tool has no description. The LLM cannot determine when or how to use it.",

  check(tools: McpTool[]): Finding[] {
    const findings: Finding[] = [];

    for (const tool of tools) {
      const desc = tool.description?.trim();
      if (!desc) {
        findings.push({
          code: "E101",
          severity: "error",
          toolName: tool.name,
          message: `Tool "${tool.name}" has no description. The LLM has no way to know when to use this tool.`,
          suggestion:
            "Add a description that explains: (1) what this tool does, (2) when to use it over similar tools, (3) what it returns.",
          docs: "https://nexus-mcp.dev/rules/E101",
        });
      }
    }

    return findings;
  },
};
