import type { Rule, Finding, McpTool } from "../../types/index.js";

// Verbs that imply write/mutate/delete operations
const SIDE_EFFECT_VERBS = [
  "create", "creates", "created",
  "update", "updates", "updated",
  "delete", "deletes", "deleted", "remove", "removes", "removed",
  "write", "writes", "wrote",
  "send", "sends", "sent",
  "post", "posts", "posted",
  "submit", "submits", "submitted",
  "save", "saves", "saved",
  "insert", "inserts", "inserted",
  "add", "adds", "added",
  "modify", "modifies", "modified",
  "patch", "patches", "patched",
  "upload", "uploads", "uploaded",
  "publish", "publishes", "published",
  "deploy", "deploys", "deployed",
  "execute", "executes", "ran", "run",
  "trigger", "triggers", "triggered",
];

// Annotations in the schema that indicate side effects are explicitly declared
const SIDE_EFFECT_ANNOTATIONS = ["x-side-effects", "x-sideEffects", "sideEffects", "readonly"];

function hasSideEffectVerb(tool: McpTool): string | null {
  const text = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
  const words = text.replace(/[^a-z0-9\s_-]/g, " ").split(/[\s_-]+/);
  const found = words.find((w) => SIDE_EFFECT_VERBS.includes(w));
  return found ?? null;
}

function hasSideEffectDeclaration(tool: McpTool): boolean {
  const schema = tool.inputSchema as Record<string, unknown>;
  return SIDE_EFFECT_ANNOTATIONS.some((annotation) => annotation in schema);
}

export const E500SideEffect: Rule = {
  code: "E500",
  name: "Undeclared Side Effect",
  description:
    "Tool appears to have side effects (write/delete/send) but does not declare them explicitly.",

  check(tools: McpTool[]): Finding[] {
    const findings: Finding[] = [];

    for (const tool of tools) {
      const verb = hasSideEffectVerb(tool);
      if (verb && !hasSideEffectDeclaration(tool)) {
        findings.push({
          code: "E500",
          severity: "warning",
          toolName: tool.name,
          message: `Tool "${tool.name}" appears to have side effects (contains verb: "${verb}") but does not declare them. The LLM may call it unexpectedly in read-only workflows.`,
          suggestion: `Add "x-side-effects": "write" (or "delete"/"send") to the inputSchema, or make the side effects explicit in the description using language like "WARNING: This tool permanently deletes..."`,
          docs: "https://nexus-mcp.dev/rules/E500",
        });
      }
    }

    return findings;
  },
};
