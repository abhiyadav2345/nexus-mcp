import type { Rule, Finding, McpTool } from "../../types/index.js";

// Common English stop words to exclude from keyword comparison
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "this", "that", "are", "was",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "shall", "its", "their",
  "which", "who", "what", "when", "where", "how", "if", "then", "so", "also",
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, " ")
      .split(/[\s_-]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );
}

function overlapPercent(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const word of setA) {
    if (setB.has(word)) shared++;
  }
  // Use Dice coefficient: 2 * |intersection| / (|A| + |B|)
  return Math.round((2 * shared * 100) / (setA.size + setB.size));
}

export function createE110Rule(thresholdPercent = 80): Rule {
  return {
    code: "E110",
    name: "Tool Ambiguity",
    description:
      "Two tools have descriptions that are too similar. The LLM may pick randomly between them.",

    check(tools: McpTool[]): Finding[] {
      const findings: Finding[] = [];
      const toolsWithDesc = tools.filter((t) => t.description?.trim());

      for (let i = 0; i < toolsWithDesc.length; i++) {
        for (let j = i + 1; j < toolsWithDesc.length; j++) {
          const toolA = toolsWithDesc[i]!;
          const toolB = toolsWithDesc[j]!;

          const keywordsA = extractKeywords(toolA.description!);
          const keywordsB = extractKeywords(toolB.description!);
          const overlap = overlapPercent(keywordsA, keywordsB);

          if (overlap >= thresholdPercent) {
            findings.push({
              code: "E110",
              severity: "error",
              toolName: toolA.name,
              message: `Tools "${toolA.name}" and "${toolB.name}" have ${overlap}% description overlap. The LLM cannot reliably distinguish between them and may pick randomly.`,
              suggestion: `Rewrite the description of "${toolA.name}" or "${toolB.name}" to clearly state: (1) when to use this tool specifically, and (2) what makes it different from the other tool.`,
              docs: "https://nexus-mcp.dev/rules/E110",
            });
          }
        }
      }

      return findings;
    },
  };
}

// Default export with standard threshold
export const E110ToolAmbiguity: Rule = createE110Rule(80);
