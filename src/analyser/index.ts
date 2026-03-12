import type { Rule, Finding, McpTool, McpResource, AnalysisResult } from "../types/index.js";
import { E101MissingDescription } from "./rules/E101-missing-description.js";
import { E102UnderspecifiedInput } from "./rules/E102-underspecified-input.js";
import { createE110Rule } from "./rules/E110-tool-ambiguity.js";
import { W104GenericDescription } from "./rules/W104-generic-description.js";
import { E301OutputExplosion } from "./rules/E301-output-explosion.js";
import { E500SideEffect } from "./rules/E500-side-effect.js";

export type AnalyserOptions = {
  ignoreRules?: string[];
  ambiguityThresholdPercent?: number;
};

export function createAnalyser(options: AnalyserOptions = {}): Rule[] {
  const allRules: Rule[] = [
    E101MissingDescription,
    E102UnderspecifiedInput,
    createE110Rule(options.ambiguityThresholdPercent ?? 80),
    W104GenericDescription,
    E301OutputExplosion,
    E500SideEffect,
  ];

  const ignore = new Set(options.ignoreRules ?? []);
  return allRules.filter((rule) => !ignore.has(rule.code));
}

export function runAnalysis(
  tools: McpTool[],
  resources: McpResource[],
  serverUrl: string,
  options: AnalyserOptions = {},
): AnalysisResult {
  const startTime = Date.now();
  const rules = createAnalyser(options);
  const findings: Finding[] = [];

  for (const rule of rules) {
    const rulefindings = rule.check(tools, resources);
    findings.push(...rulefindings);
  }

  const durationMs = Date.now() - startTime;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  return {
    serverUrl,
    toolCount: tools.length,
    findings,
    errorCount,
    warningCount,
    durationMs,
  };
}

export type { Rule, Finding } from "../types/index.js";
