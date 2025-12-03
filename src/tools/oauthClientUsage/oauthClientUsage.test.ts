import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpError } from "@modelcontextprotocol/sdk/types.js";
import type { MockedObjectDeep } from "@vitest/spy";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { oauthClientUsage, type ToolDependencies } from "./oauthClientUsage.js";

describe("OAuth Client Usage", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      oauthApi: {
        postOauthClientUsageQuery: vi.fn(),
        getOauthClientUsageQueryResult: vi.fn(),
      },
      cache: undefined,
    };
    const toolDefinition = oauthClientUsage(toolDeps);
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
      name: "oauth_client_usage",
      title: undefined,
      _meta: undefined,
      annotations: { title: "OAuth Client Usage" },
      description:
        "Retrieves the usage of an OAuth Client for a given period. It returns the total number of requests and a breakdown of requests per organization.",
      inputSchema: {
        properties: {
          oauthClientId: {
            description:
              "The UUID of the OAuth Client to retrieve the usage for (e.g., 00000000-0000-0000-0000-000000000000)",
            format: "uuid",
            type: "string",
          },
          endDate: {
            description:
              "The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')",
            type: "string",
          },
          startDate: {
            description:
              "The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')",
            type: "string",
          },
        },
        required: ["oauthClientId", "startDate", "endDate"],
        type: "object",
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
    });
  });

  test("errors when no OAuth Client ID is provided", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          oauthClientId: "",
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-01-02T00:00:00Z",
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("oauthClientId") &&
        error.message.includes("Invalid uuid"),
    );
  });

  test("errors when dates are invalid", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          oauthClientId: randomUUID(),
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
          oauthClientId: randomUUID(),
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

  test("OAuth Client usage returned for date range", async () => {
    const oauthClientId = randomUUID();
    const executionId = randomUUID();

    toolDeps.oauthApi.postOauthClientUsageQuery.mockResolvedValue({
      executionId,
      resultsUri: `/api/v2/oauth/clients/${oauthClientId}/usage/query/results/${executionId}`,
    });

    toolDeps.oauthApi.getOauthClientUsageQueryResult.mockResolvedValue({
      results: [
        {
          templateUri: "api/v2/authorization/divisions",
          httpMethod: "GET",
          requests: 5,
        },
        {
          templateUri: "api/v2/authorization/roles",
          httpMethod: "GET",
          requests: 10,
        },
      ],
      queryStatus: "Complete",
    });

    const startDate = "2024-01-01T00:00:00Z";
    const endDate = "2024-01-02T00:00:00Z";
    const result = await client.callTool({
      name: toolName,
      arguments: {
        oauthClientId,
        startDate,
        endDate,
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            startDate,
            endDate,
            totalRequests: 15,
            requestsPerEndpoint: [
              {
                endpoint: "GET api/v2/authorization/divisions",
                requests: 5,
              },
              {
                endpoint: "GET api/v2/authorization/roles",
                requests: 10,
              },
            ],
          }),
        },
      ],
    });
  });
});
