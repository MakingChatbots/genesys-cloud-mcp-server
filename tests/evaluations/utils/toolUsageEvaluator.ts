import type { CallToolTrace } from "./callToolInterceptor.js";

export function toolUsageEvaluator(
  traces: readonly CallToolTrace[],
  expectedTools: string[],
) {
  const calledTools = traces.map((t) => t.request.name);

  return {
    /**
     * Tools that were expected to be used and were actually used.
     */
    get correctToolsCalled() {
      return expectedTools.filter((t) => calledTools.includes(t));
    },

    /**
     * Tools that were expected but not used.
     */
    get missingTools() {
      return expectedTools.filter((t) => !calledTools.includes(t));
    },

    /**
     * Tools that were used but not expected.
     */
    get extraneousToolsCalled() {
      return calledTools.filter((t) => !expectedTools.includes(t));
    },

    /**
     * Total number of tool calls made by the LLM during the task.
     */
    get totalCalls() {
      return traces.length;
    },

    /**
     * Proportion of expected tools that were correctly used (0–1)
     */
    get toolAccuracy() {
      return this.correctToolsCalled.length / expectedTools.length;
    },
  };
}

export function prettyPrintResults(
  evaluationResults: ReturnType<typeof toolUsageEvaluator>,
) {
  return {
    "Correct tools:": evaluationResults.correctToolsCalled,
    "Extraneous calls:": evaluationResults.extraneousToolsCalled,
    "Missing tools:": evaluationResults.missingTools,
    "Total calls:": evaluationResults.totalCalls,
    "Tool accuracy:": evaluationResults.toolAccuracy,
  };
}
