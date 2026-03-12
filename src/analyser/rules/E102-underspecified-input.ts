import type { Rule, Finding, McpTool, McpSchemaProperty } from "../../types/index.js";

function isParameterSpecified(prop: McpSchemaProperty): boolean {
  return !!(
    prop.description?.trim() ||
    (prop.enum && prop.enum.length > 0) ||
    prop.format ||
    (prop.examples && prop.examples.length > 0)
  );
}

export const E102UnderspecifiedInput: Rule = {
  code: "E102",
  name: "Underspecified Input Parameter",
  description:
    "A tool parameter lacks description, enum, format, or examples. The LLM may hallucinate values.",

  check(tools: McpTool[]): Finding[] {
    const findings: Finding[] = [];

    for (const tool of tools) {
      const properties = tool.inputSchema.properties ?? {};

      for (const [paramName, prop] of Object.entries(properties)) {
        if (!isParameterSpecified(prop)) {
          findings.push({
            code: "E102",
            severity: "error",
            toolName: tool.name,
            message: `Parameter "${paramName}" in tool "${tool.name}" has no description or constraints. The LLM may hallucinate values for it.`,
            suggestion: `Add a "description" field to "${paramName}" explaining what value it expects. If it has a fixed set of values, use "enum". If it has a specific format, use "format" (e.g., "email", "uuid", "date-time").`,
            docs: "https://nexus-mcp.dev/rules/E102",
          });
        }
      }
    }

    return findings;
  },
};
