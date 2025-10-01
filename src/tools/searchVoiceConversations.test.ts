import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MockedObjectDeep } from "@vitest/spy";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  searchVoiceConversations,
  type ToolDependencies,
} from "./searchVoiceConversations.js";

describe("Search Voice Conversations Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      analyticsApi: {
        postAnalyticsConversationsDetailsQuery: vi.fn(),
      },
    };

    const toolDefinition = searchVoiceConversations(toolDeps);
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
      name: "search_voice_conversations",
      title: undefined,
      _meta: undefined,
      annotations: { title: "Search Voice Conversations" },
      description:
        "Searches for voice conversations within a specified time window, optionally filtering by phone number. Returns a paginated list of conversation IDs and call duration for use in further analysis or tool calls.",
      inputSchema: {
        type: "object",
        properties: {
          endDate: {
            description:
              "The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')",
            type: "string",
          },
          pageNumber: {
            description:
              "The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets",
            exclusiveMinimum: 0,
            type: "integer",
          },
          pageSize: {
            description:
              "The maximum number of conversations to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 100",
            exclusiveMinimum: 0,
            maximum: 100,
            type: "integer",
          },
          phoneNumber: {
            description:
              "Optional. Filters results to only include conversations involving this phone number (e.g., '+440000000000')",
            type: "string",
          },
          startDate: {
            description:
              "The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')",
            type: "string",
          },
        },
        required: ["startDate", "endDate"],
        additionalProperties: false,

        $schema: "http://json-schema.org/draft-07/schema#",
      },
    });
  });

  test("errors when dates are invalid", async () => {
    toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery.mockResolvedValue(
      { conversations: [] },
    );

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          startDate: "invalid-date",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            errorMessage: "startDate is not a valid ISO-8601 date",
          }),
        },
      ],
    });

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "invalid-date",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            errorMessage: "endDate is not a valid ISO-8601 date",
          }),
        },
      ],
    });
  });

  test("fails when startDate is after endDate", async () => {
    toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery.mockResolvedValue(
      { conversations: [] },
    );

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          startDate: "2024-01-02T00:00:00Z",
          endDate: "2024-01-01T00:00:00Z",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            errorMessage: "Start date must be before end date",
          }),
        },
      ],
    });
  });

  test("error from Genesys Cloud's Platform SDK returned", async () => {
    toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery.mockRejectedValue(
      new Error("Test Error Message"),
    );

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            errorMessage: "Failed to search conversations: Test Error Message",
          }),
        },
      ],
    });
  });

  test("single conversation returned with duration", async () => {
    const conversationId = randomUUID();

    toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery.mockResolvedValue(
      {
        conversations: [
          {
            conversationId,
            conversationStart: "2024-01-01T10:00:00.000Z",
            conversationEnd: "2024-01-01T11:00:00.000Z",
          },
        ],
        totalHits: 1,
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-02T00:00:00Z",
      },
    });

    expect(
      toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery,
    ).toBeCalledWith({
      order: "desc",
      orderBy: "conversationStart",
      paging: { pageSize: 100, pageNumber: 1 },
      interval: "2024-01-01T00:00:00.000Z/2024-01-02T00:00:00.000Z",
      segmentFilters: [
        {
          type: "or",
          predicates: [
            {
              dimension: "mediaType",
              value: "voice",
            },
          ],
        },
        {
          type: "or",
          predicates: [
            {
              dimension: "direction",
              value: "inbound",
            },
            {
              dimension: "direction",
              value: "outbound",
            },
          ],
        },
      ],
      conversationFilters: [],
      evaluationFilters: [],
      surveyFilters: [],
    });

    expect(result).toStrictEqual({
      content: [
        {
          text: JSON.stringify({
            conversations: [
              {
                conversationId,
                duration: "1 hour",
              },
            ],
            pagination: {
              pageNumber: 1,
              pageSize: 100,
              totalPages: 1,
              totalConversationsReturned: 1,
            },
          }),
          type: "text",
        },
      ],
    });
  });

  test("single conversation returned with phone # criteria", async () => {
    const conversationId = randomUUID();

    toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery.mockResolvedValue(
      {
        conversations: [
          {
            conversationId,
            conversationStart: undefined,
            conversationEnd: undefined,
          },
        ],
        totalHits: 1,
      },
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        phoneNumber: "+111 2222 3333",
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-02T00:00:00Z",
      },
    });

    expect(
      toolDeps.analyticsApi.postAnalyticsConversationsDetailsQuery,
    ).toBeCalledWith({
      order: "desc",
      orderBy: "conversationStart",
      paging: { pageSize: 100, pageNumber: 1 },
      interval: "2024-01-01T00:00:00.000Z/2024-01-02T00:00:00.000Z",
      segmentFilters: [
        {
          type: "or",
          predicates: [
            {
              dimension: "mediaType",
              value: "voice",
            },
          ],
        },
        {
          type: "or",
          predicates: [
            {
              dimension: "direction",
              value: "inbound",
            },
            {
              dimension: "direction",
              value: "outbound",
            },
          ],
        },
        {
          type: "or",
          predicates: [
            {
              dimension: "ani",
              value: "11122223333",
            },
          ],
        },
      ],
      conversationFilters: [],
      evaluationFilters: [],
      surveyFilters: [],
    });

    expect(result).toStrictEqual({
      content: [
        {
          text: JSON.stringify({
            conversations: [
              {
                conversationId,
              },
            ],
            pagination: {
              pageNumber: 1,
              pageSize: 100,
              totalPages: 1,
              totalConversationsReturned: 1,
            },
          }),
          type: "text",
        },
      ],
    });
  });
});
