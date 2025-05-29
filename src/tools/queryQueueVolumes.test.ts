import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockedObjectDeep } from "@vitest/spy";
import { queryQueueVolumes, ToolDependencies } from "./queryQueueVolumes.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";

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

    const toolDefinition = queryQueueVolumes(toolDeps);
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
      name: "query_queue_volumes",
      description:
        "Returns a breakdown of how many conversations occurred in each specified queue between two dates. Useful for comparing workload across queues.",
      inputSchema: {
        type: "object",
        properties: {
          queueIds: {
            type: "array",
            items: {
              type: "string",
              format: "uuid",
              description:
                "A UUID ID for a queue. (e.g., 00000000-0000-0000-0000-000000000000)",
            },
            minItems: 1,
            maxItems: 300,
            description:
              "List of up to 300 queue IDs to filter conversations by",
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
        required: ["queueIds", "startDate", "endDate"],
        additionalProperties: false,

        $schema: "http://json-schema.org/draft-07/schema#",
      },
      annotations: undefined,
    });
  });

  test("errors when no queue IDs provided", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          queueIds: [],
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("queueId") &&
        error.message.includes("Array must contain at least 1 element(s)"),
    );
  });

  test("errors when dates are invalid", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          queueIds: [randomUUID()],
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
          queueIds: [randomUUID()],
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
          queueIds: [randomUUID()],
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

  test("call volume returned for single queue", async () => {
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
        queueIds: [queueId],
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
          text: `
Queue volume breakdown for that period:
Queue ID: ${queueId} - Total conversations: 1
  `.trim(),
        },
      ],
    });
  });

  test("call volume returned for multiple queues", async () => {
    const queueIdOne = randomUUID();
    const queueIdTwo = randomUUID();
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
              { sessions: [{ segments: [{ queueId: queueIdOne }] }] },
            ],
          },
          {
            participants: [
              { sessions: [{ segments: [{ queueId: queueIdOne }] }] },
              { sessions: [{ segments: [{ queueId: queueIdTwo }] }] },
            ],
          },
        ],
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        queueIds: [queueIdOne, queueIdTwo],
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
          predicates: [
            { dimension: "queueId", value: queueIdOne },
            { dimension: "queueId", value: queueIdTwo },
          ],
        },
      ],
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `
Queue volume breakdown for that period:
Queue ID: ${queueIdOne} - Total conversations: 2
Queue ID: ${queueIdTwo} - Total conversations: 1
`.trim(),
        },
      ],
    });
  });
});
