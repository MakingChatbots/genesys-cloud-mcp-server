import { beforeEach, describe, expect, test, vi } from "vitest";
import { conversationTopics, ToolDependencies } from "./conversationTopics.js";
import { MockedObjectDeep } from "@vitest/spy";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { randomUUID } from "node:crypto";
import { McpError } from "@modelcontextprotocol/sdk/types.js";

describe("Conversation Topics Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      speechTextAnalyticsApi: {
        getSpeechandtextanalyticsTopics: vi.fn(),
      },
      analyticsApi: {
        getAnalyticsConversationDetails: vi.fn(),
        postAnalyticsTranscriptsAggregatesQuery: vi.fn(),
      },
    };

    const toolDefinition = conversationTopics(toolDeps);
    toolName = toolDefinition.schema.name;

    const server = new McpServer({ name: "TestServer", version: "test" });
    server.tool(
      toolDefinition.schema.name,
      toolDefinition.schema.description,
      toolDefinition.schema.paramsSchema.shape,
      toolDefinition.call,
    );

    const [serverTransport, clientTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  test("schema describes tool", async () => {
    const tools = await client.listTools();
    expect(tools.tools[0]).toStrictEqual({
      name: "conversation_topics",
      description:
        "Retrieves Speech and Text Analytics topics detected for a specific conversation. Topics represent business-level intents (e.g. cancellation, billing enquiry) inferred from recognised phrases in the customer-agent interaction.",
      inputSchema: {
        type: "object",
        properties: {
          conversationId: {
            description:
              "A UUID ID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)",
            format: "uuid",
            type: "string",
          },
        },
        required: ["conversationId"],
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      annotations: undefined,
    });
  });

  test("errors when no conversation ID provided", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          conversationId: "",
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("conversationId") &&
        error.message.includes("Invalid uuid"),
    );
  });

  test("sentiment returned for single conversation", async () => {
    const conversationId = randomUUID();

    toolDeps.analyticsApi.getAnalyticsConversationDetails.mockResolvedValue({
      conversationStart: "2025-05-19T20:00:07.395Z",
      conversationEnd: "2025-05-19T21:00:52.686Z",
    });
    toolDeps.analyticsApi.postAnalyticsTranscriptsAggregatesQuery.mockResolvedValue(
      {
        results: [
          { group: { topicId: "test-topic-id-1" } },
          { group: { topicId: "test-topic-id-2" } },
        ],
      },
    );
    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsTopics.mockResolvedValue(
      {
        entities: [
          {
            name: "Test Topic 1",
            description: "Test Topic 1 Desc",
          },
          {
            name: "Test Topic 2",
            description: "Test Topic 2 Desc",
          },
        ],
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        conversationId: conversationId,
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `
Conversation ID: ${conversationId}
Detected Topics:
 • Test Topic 1: Test Topic 1 Desc
 • Test Topic 2: Test Topic 2 Desc
`.trim(),
        },
      ],
    });
  });
});
