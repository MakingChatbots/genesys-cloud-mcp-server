import { GoogleGenAI, mcpToTool } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { SearchQueuesResponse } from "../../src/tools/searchQueues.js";
import {
  type CallToolInterception,
  type CallToolResult,
  callToolInterceptor,
  prettyPrintResults,
  spyOnClientCallTool,
  toolUsageEvaluator,
} from "./utils/index.js";

const timeout = 30_000;
const model = "gemini-2.5-flash";

const searchQueueInterceptor: CallToolInterception = {
  shouldIntercept: (call: CallToolRequest["params"]) => {
    return call.name === "search_queues";
  },
  intercept: (): Promise<CallToolResult> => {
    const response: SearchQueuesResponse = {
      queues: [
        {
          name: "Lucas_Test_Queue",
          id: "c1c893ed-b765-4361-abc3-7bb3f5b7d6e5",
          memberCount: 0,
        },
      ],
      pagination: {
        pageNumber: 1,
        pageSize: 100,
        totalPages: 1,
        totalMatchingQueues: 1,
      },
    };

    return Promise.resolve({
      content: [
        {
          type: "text",
          text: JSON.stringify(response),
        },
      ],
    });
  },
};

const interceptors = [searchQueueInterceptor];

describe(
  "Evaluate efficient tool use",
  () => {
    let client: Client;
    let ai: GoogleGenAI;

    beforeEach(async () => {
      const transport = new StdioClientTransport({
        command: "npm",
        args: ["run", "start"],
        env: {
          GENESYSCLOUD_REGION: process.env.GENESYSCLOUD_REGION ?? "",
          GENESYSCLOUD_OAUTHCLIENT_ID:
            process.env.GENESYSCLOUD_OAUTHCLIENT_ID ?? "",
          GENESYSCLOUD_OAUTHCLIENT_SECRET:
            process.env.GENESYSCLOUD_OAUTHCLIENT_SECRET ?? "",
        },
      });

      client = new Client({
        name: "genesys-cloud-mcp-client",
        version: "1.0.0",
      });

      ai = new GoogleGenAI({});
      await client.connect(transport);
    });

    afterEach(async () => client.close());

    test("search_queue is called for simple queue query", async () => {
      const interceptor = callToolInterceptor(interceptors);

      spyOnClientCallTool(client).spy.mockImplementation((args) =>
        interceptor.call(args),
      );

      const response = await ai.models.generateContent({
        model,
        contents: `How many queues start with LUCAS?`,
        config: {
          tools: [mcpToTool(client)],
        },
      });

      console.log("LLM Response", response.text);

      const evaluationResults = toolUsageEvaluator(interceptor.toolCallTraces, [
        "search_queues",
      ]);

      console.log("Evaluation Results", prettyPrintResults(evaluationResults));

      expect(evaluationResults.toolAccuracy).toBe(1);
      expect(evaluationResults.extraneousToolsCalled.length).toBe(0);
    });

    test("Total conversations last week", async () => {
      const clientCallToolSpyResult = spyOnClientCallTool(client);

      const response = await ai.models.generateContent({
        model,
        contents: `How many conversations were there between today (${new Date().toISOString()}) and 15 days ago against queues containing TEST in the name?`,
        config: {
          tools: [mcpToTool(client)],
        },
      });

      console.log("LLM Response", response.text);
      console.dir(await clientCallToolSpyResult.tracesFromCallTools(), {
        depth: 10,
      });
    });
  },
  timeout,
);
