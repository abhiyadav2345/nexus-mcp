import type { Rule, Finding, McpTool } from "../../types/index.js";

// Words in tool name/description that suggest list/collection returns
const LIST_INDICATORS = [
  "list", "all", "search", "find", "query", "fetch_all", "get_all",
  "scan", "browse", "index", "collection", "many", "multiple", "bulk",
];

// Parameter names that suggest pagination is already handled
const PAGINATION_PARAMS = [
  "limit", "max", "max_results", "page", "page_size", "pagesize",
  "per_page", "perpage", "cursor", "offset", "take", "count",
  "page_number", "pagenumber", "size",
];

function hasListIndicator(tool: McpTool): boolean {
  const text = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
  return LIST_INDICATORS.some((word) => text.includes(word));
}

function hasPaginationParam(tool: McpTool): boolean {
  const params = Object.keys(tool.inputSchema.properties ?? {}).map((k) =>
    k.toLowerCase(),
  );
  return params.some((p) => PAGINATION_PARAMS.includes(p));
}

export const E301OutputExplosion: Rule = {
  code: "E301",
  name: "Output Explosion Risk",
  description:
    "Tool may return an unbounded list of results, potentially overflowing the LLM context window.",

  check(tools: McpTool[]): Finding[] {
    const findings: Finding[] = [];

    for (const tool of tools) {
      if (hasListIndicator(tool) && !hasPaginationParam(tool)) {
        findings.push({
          code: "E301",
          severity: "warning",
          toolName: tool.name,
          message: `Tool "${tool.name}" appears to return a list/collection but has no pagination parameter. This may return an unbounded number of results, overflowing the LLM's context window.`,
          suggestion: `Add a "limit" parameter (e.g., default: 20, max: 100) or a "cursor"/"page" parameter for pagination. Also document the maximum possible response size in the tool description.`,
          docs: "https://nexus-mcp.dev/rules/E301",
        });
      }
    }

    return findings;
  },
};
