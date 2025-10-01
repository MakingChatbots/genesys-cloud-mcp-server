import { beforeEach, describe, expect, test, vi } from "vitest";
import { type MockedObjectDeep } from "@vitest/spy";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { type McpError } from "@modelcontextprotocol/sdk/types.js";
import { type ToolDependencies, voiceCallQuality } from "./voiceCallQuality.js";

describe("Voice Call Quality Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      analyticsApi: {
        getAnalyticsConversationsDetails: vi.fn(),
      },
    };

    const toolDefinition = voiceCallQuality(toolDeps);
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
      name: "voice_call_quality",
      title: undefined,
      _meta: undefined,
      annotations: { title: "Voice Call Quality" },
      description:
        "Retrieves voice call quality metrics for one or more conversations by ID. This tool specifically focuses on voice interactions and returns the minimum Mean Opinion Score (MOS) observed in each conversation as structured JSON. MOS is a measure of perceived audio quality based on factors such as jitter, latency, packet loss, and codec. Use the following legend to interpret MOS values:\n\n" +
        "  • Poor:       MOS < 3.5\n" +
        "  • Acceptable: 3.5 ≤ MOS < 4.3\n" +
        "  • Excellent:  MOS ≥ 4.3",
      inputSchema: {
        properties: {
          conversationIds: {
            description:
              "A list of up to 100 conversation IDs to evaluate voice call quality for",
            items: {
              description:
                "A UUID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)",
              format: "uuid",
              type: "string",
            },
            maxItems: 100,
            minItems: 1,
            type: "array",
          },
        },
        required: ["conversationIds"],
        type: "object",
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
        error.message.includes("conversationIds") &&
        error.message.includes("Array must contain at least 1 element(s)"),
    );
  });

  test("error from Genesys Cloud's Platform SDK returned", async () => {
    toolDeps.analyticsApi.getAnalyticsConversationsDetails.mockRejectedValue(
      new Error("Test Error Message"),
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
          text: JSON.stringify({
            errorMessage:
              "Failed to query conversations call quality: Test Error Message",
          }),
        },
      ],
    });
  });

  test("voice call returned for single conversation", async () => {
    const conversationId = randomUUID();

    toolDeps.analyticsApi.getAnalyticsConversationsDetails.mockResolvedValue({
      conversations: [
        {
          conversationId,
          mediaStatsMinConversationMos: 3.5,
        },
      ],
    });

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
          text: JSON.stringify({
            conversations: [
              {
                conversationId: conversationId,
                minimumMos: "3.50",
                qualityLabel: "Acceptable",
              },
            ],
          }),
        },
      ],
    });
  });

  test("sentiment returned for multiple conversations", async () => {
    const conversationOneId = randomUUID();
    const conversationTwoId = randomUUID();

    toolDeps.analyticsApi.getAnalyticsConversationsDetails.mockResolvedValue({
      conversations: [
        {
          conversationId: conversationOneId,
          mediaStatsMinConversationMos: 3.5,
        },
        {
          conversationId: conversationTwoId,
          mediaStatsMinConversationMos: 1.0,
        },
      ],
    });

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
          text: JSON.stringify({
            conversations: [
              {
                conversationId: conversationOneId,
                minimumMos: "3.50",
                qualityLabel: "Acceptable",
              },
              {
                conversationId: conversationTwoId,
                minimumMos: "1.00",
                qualityLabel: "Poor",
              },
            ],
          }),
        },
      ],
    });
  });
});
