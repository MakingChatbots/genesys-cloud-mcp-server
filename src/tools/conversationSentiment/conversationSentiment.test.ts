import { beforeEach, describe, expect, test, vi } from "vitest";
import { type MockedObjectDeep } from "@vitest/spy";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { type McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  conversationSentiment,
  type ToolDependencies,
} from "./conversationSentiment.js";

describe("Conversation Sentiment Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      speechTextAnalyticsApi: {
        getSpeechandtextanalyticsConversation: vi.fn(),
      },
    };

    const toolDefinition = conversationSentiment(toolDeps);
    toolName = toolDefinition.schema.name;

    const server = new McpServer({ name: "TestServer", version: "test" });
    server.tool(
      toolDefinition.schema.name,
      toolDefinition.schema.description,
      toolDefinition.schema.paramsSchema.shape,
      toolDefinition.schema.annotations,
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
      name: "conversation_sentiment",
      title: undefined,
      annotations: { title: "Conversation Sentiment" },
      description:
        "Retrieves sentiment analysis scores for one or more conversations. Sentiment is evaluated based on customer phrases, categorized as positive, neutral, or negative. The result includes both a numeric sentiment score (-100 to 100) and an interpreted sentiment label.",
      inputSchema: {
        type: "object",
        properties: {
          conversationIds: {
            type: "array",
            items: {
              type: "string",
              format: "uuid",
              description:
                "A UUID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)",
            },
            minItems: 1,
            maxItems: 100,
            description:
              "A list of up to 100 conversation IDs to retrieve sentiment for",
          },
        },
        required: ["conversationIds"],
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
    });
  });

  test("errors when no conversation IDs provided", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          conversationIds: [],
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("conversationId") &&
        error.message.includes("Array must contain at least 1 element(s)"),
    );
  });

  test("errors when conversation ID not UUID", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          conversationIds: ["invalid-uuid"],
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("conversationIds") &&
        error.message.includes("Invalid uuid"),
    );
  });

  test("error from Genesys Cloud's Platform SDK returned", async () => {
    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsConversation.mockRejectedValue(
      { code: "not.authorized", status: 403 },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        conversationIds: [randomUUID()],
      },
    });

    expect(result).toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Failed to retrieve sentiment analysis: Unauthorised access. Please check API credentials or permissions.",
        },
      ],
    });
  });

  test("conversations not found are included in results", async () => {
    const conversationId = randomUUID();
    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsConversation.mockRejectedValue(
      {
        code: "resource.not.found",
        messageParams: {
          id: conversationId,
        },
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        conversationIds: [conversationId],
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `
Sentiment results for 1 conversation(s):

• Conversation ID: ${conversationId}
  • Error: Conversation not found
`.trim(),
        },
      ],
    });
  });

  test("sentiment returned for single conversation", async () => {
    const conversationId = randomUUID();
    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsConversation.mockResolvedValue(
      {
        conversation: { id: conversationId },
        sentimentScore: 0.4,
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        conversationIds: [conversationId],
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `
Sentiment results for 1 conversation(s):

• Conversation ID: ${conversationId}
  • Sentiment Score: 40 (Slightly Positive)
`.trim(),
        },
      ],
    });
  });

  test("sentiment returned for multiple conversations", async () => {
    const conversationOneId = randomUUID();
    const conversationTwoId = randomUUID();

    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsConversation.mockImplementation(
      (id) =>
        new Promise((resolve, reject) => {
          if (id === conversationOneId) {
            resolve({
              conversation: { id: conversationOneId },
              sentimentScore: 0.1,
            });
            return;
          }
          if (id === conversationTwoId) {
            resolve({
              conversation: { id: conversationTwoId },
              sentimentScore: 0.2,
            });
            return;
          }

          reject(new Error("Unknown conversation ID"));
        }),
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        conversationIds: [conversationOneId, conversationTwoId],
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `
Sentiment results for 2 conversation(s):

• Conversation ID: ${conversationOneId}
  • Sentiment Score: 10 (Neutral)

• Conversation ID: ${conversationTwoId}
  • Sentiment Score: 20 (Slightly Positive)
`.trim(),
        },
      ],
    });
  });
});
