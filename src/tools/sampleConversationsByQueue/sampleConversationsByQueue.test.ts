import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockedObjectDeep } from "@vitest/spy";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import {
  ToolDependencies,
  sampleConversationsByQueue,
} from "./sampleConversationsByQueue.js";

describe("Query Queue Volumes Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      analyticsApi: {
        postAnalyticsConversationsDetailsJobs: vi.fn(),
        getAnalyticsConversationsDetailsJob: vi.fn(),
        getAnalyticsConversationsDetailsJobResults: vi.fn(),
      },
    };

    const toolDefinition = sampleConversationsByQueue(toolDeps);
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
      name: "sample_conversations_by_queue",
      title: undefined,
      description:
        "Retrieves conversation analytics for a specific queue between two dates, returning a representative sample of conversation IDs. Useful for reporting, investigation, or summarisation.",

      inputSchema: {
        type: "object",
        properties: {
          queueId: {
            description:
              "The UUID of the queue to filter conversations by. (e.g., 00000000-0000-0000-0000-000000000000)",
            format: "uuid",
            type: "string",
          },
          startDate: {
            type: "string",
            description:
              "The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')",
          },
          endDate: {
            type: "string",
            description:
              "The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')",
          },
        },
        required: ["queueId", "startDate", "endDate"],
        additionalProperties: false,

        $schema: "http://json-schema.org/draft-07/schema#",
      },
      annotations: undefined,
    });
  });

  test("errors when no queue ID provided", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          queueId: "",
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("queueId") &&
        error.message.includes("Invalid uuid"),
    );
  });

  test("errors when dates are invalid", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          queueId: randomUUID(),
          startDate: "invalid-date",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "startDate is not a valid ISO-8601 date.",
        },
      ],
    });

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          queueId: randomUUID(),
          startDate: "2024-01-01T00:00:00Z",
          endDate: "invalid-date",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "endDate is not a valid ISO-8601 date.",
        },
      ],
    });
  });

  test("error from Genesys Cloud's Platform SDK returned", async () => {
    toolDeps.analyticsApi.postAnalyticsConversationsDetailsJobs.mockRejectedValue(
      new Error("Test Error Message"),
    );

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          queueId: randomUUID(),
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Failed to query conversations: Test Error Message",
        },
      ],
    });
  });

  test("message returned if no conversations found", async () => {
    const queueId = randomUUID();
    const jobId = randomUUID();

    toolDeps.analyticsApi.postAnalyticsConversationsDetailsJobs.mockResolvedValue(
      { jobId: jobId },
    );
    toolDeps.analyticsApi.getAnalyticsConversationsDetailsJob.mockResolvedValue(
      {
        state: "FULFILLED",
      },
    );
    toolDeps.analyticsApi.getAnalyticsConversationsDetailsJobResults.mockResolvedValue(
      {
        conversations: [
          {
            participants: [
              { sessions: [{ segments: [{ queueId: queueId }] }] },
            ],
          },
        ],
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        queueId: queueId,
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-02T00:00:00Z",
      },
    });

    expect(
      toolDeps.analyticsApi.postAnalyticsConversationsDetailsJobs,
    ).toBeCalledWith({
      interval: "2024-01-01T00:00:00.000Z/2024-01-02T00:00:00.000Z",
      order: "asc",
      orderBy: "conversationStart",
      segmentFilters: [
        {
          type: "and",
          predicates: [{ dimension: "purpose", value: "customer" }],
        },
        {
          type: "or",
          predicates: [{ dimension: "queueId", value: queueId }],
        },
      ],
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "No conversations found in queue during specified period.",
        },
      ],
    });
  });

  test("sample of conversations returned for queue", async () => {
    const queueId = randomUUID();
    const jobId = randomUUID();

    const conversationOneId = randomUUID();
    const conversationTwoId = randomUUID();
    const conversationThreeId = randomUUID();

    toolDeps.analyticsApi.postAnalyticsConversationsDetailsJobs.mockResolvedValue(
      { jobId: jobId },
    );
    toolDeps.analyticsApi.getAnalyticsConversationsDetailsJob.mockResolvedValue(
      {
        state: "FULFILLED",
      },
    );
    toolDeps.analyticsApi.getAnalyticsConversationsDetailsJobResults.mockResolvedValue(
      {
        conversations: [
          { conversationId: conversationOneId },
          { conversationId: conversationTwoId },
          { conversationId: conversationThreeId },
        ],
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        queueId: queueId,
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-02T00:00:00Z",
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `Sample of 3 conversations (out of 3) in the queue during that period.

Conversation IDs:
${conversationOneId}
${conversationTwoId}
${conversationThreeId}
`.trim(),
        },
      ],
    });
  });
});
