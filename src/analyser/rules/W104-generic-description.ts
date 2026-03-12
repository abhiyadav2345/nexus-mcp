import type { Rule, Finding, McpTool } from "../../types/index.js";

const GENERIC_WORDS = new Set([
  "gets", "get", "fetches", "fetch", "retrieves", "retrieve",
  "returns", "return", "gives", "give", "provides", "provide",
  "data", "information", "info", "result", "results", "response",
  "the", "a", "an", "this", "tool", "function", "method",
  "performs", "perform", "executes", "execute", "runs", "run",
  "does", "makes", "make", "handles", "handle",
]);

const MIN_WORD_COUNT = 10;

function isGenericDescription(description: string): { generic: boolean; reason: string } {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length < MIN_WORD_COUNT) {
    return {
      generic: true,
      reason: `only ${words.length} words (minimum is ${MIN_WORD_COUNT})`,
    };
  }

  const nonGenericWords = words.filter((w) => !GENERIC_WORDS.has(w));
  const genericRatio = 1 - nonGenericWords.length / words.length;

  if (genericRatio > 0.7) {
    return {
      generic: true,
      reason: `${Math.round(genericRatio * 100)}% of words are generic/filler words`,
    };
  }

  return { generic: false, reason: "" };
}

export const W104GenericDescription: Rule = {
  code: "W104",
  name: "Generic Description",
  description:
    "Tool description is too short or uses only generic words. Poor tool selection is likely.",

  check(tools: McpTool[]): Finding[] {
    const findings: Finding[] = [];

    for (const tool of tools) {
      const desc = tool.description?.trim();
      // Skip if no description (E101 already covers that)
      if (!desc) continue;

      const { generic, reason } = isGenericDescription(desc);
      if (generic) {
        findings.push({
          code: "W104",
          severity: "warning",
          toolName: tool.name,
          message: `Tool "${tool.name}" has a generic description (${reason}): "${desc}"`,
          suggestion:
            "Write a specific description that explains: what exact data this tool retrieves, what system it connects to, what format it returns, and when to use it instead of other tools.",
          docs: "https://nexus-mcp.dev/rules/W104",
        });
      }
    }

    return findings;
  },
};
