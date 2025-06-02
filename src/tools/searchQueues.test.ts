import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockedObjectDeep } from "@vitest/spy";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { searchQueues, ToolDependencies } from "./searchQueues.js";
import { randomUUID } from "node:crypto";

describe("Search Queues Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      routingApi: {
        getRoutingQueues: vi.fn(),
      },
    };

    const toolDefinition = searchQueues(toolDeps);
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
      name: "search_queues",
      description:
        "Searches for routing queues based on their name, allowing for wildcard searches. Returns a paginated list of matching queues, including their Name, ID, Description (if available), and Member Count (if available). Also provides pagination details like current page, page size, total results found, and total pages available. Useful for finding specific queue IDs, checking queue configurations, or listing available queues.",
      inputSchema: {
        properties: {
          name: {
            description:
              "The name (or partial name) of the routing queue(s) to search for. Wildcards ('*') are supported for pattern matching (e.g., 'Support*', '*Emergency', '*Sales*'). Use '*' alone to retrieve all queues",
            type: "string",
            minLength: 1,
          },
          pageNumber: {
            description:
              "The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets",
            exclusiveMinimum: 0,
            type: "integer",
          },
          pageSize: {
            description:
              "The maximum number of queues to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 500",
            exclusiveMinimum: 0,
            maximum: 500,
            type: "integer",
          },
        },
        required: ["name"],
        type: "object",
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      annotations: undefined,
    });
  });

  test("errors when no queue name is provided", async () => {
    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          name: "",
        },
      }),
    ).rejects.toSatisfy(
      (error: McpError) =>
        error.name === "McpError" &&
        error.message.includes("name") &&
        error.message.includes("String must contain at least 1 character(s)"),
    );
  });

  test("error from Genesys Cloud's Platform SDK returned", async () => {
    toolDeps.routingApi.getRoutingQueues.mockRejectedValue(
      new Error("Test Error Message"),
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {
        name: "test-queue",
      },
    });

    expect(result).toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Failed to search queues: Test Error Message",
        },
      ],
    });
  });

  test("message provided for no queues found", async () => {
    toolDeps.routingApi.getRoutingQueues.mockResolvedValue({
      entities: [],
    });

    const result = await client.callTool({
      name: toolName,
      arguments: {
        name: "*",
      },
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "No routing queues found in the system.",
        },
      ],
    });
  });

  test("queue IDs returned for matching queue names", async () => {
    const queueId = randomUUID();

    toolDeps.routingApi.getRoutingQueues.mockResolvedValue({
      entities: [
        {
          id: queueId,
          name: "test-queue",
        },
      ],
    });

    const result = await client.callTool({
      name: toolName,
      arguments: {
        name: "test-queue",
      },
    });

    expect(toolDeps.routingApi.getRoutingQueues).toHaveBeenCalledWith({
      name: "test-queue",
      pageNumber: 1,
      pageSize: 100,
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `
Found the following queues matching "test-queue":
• Name: test-queue
  • ID: ${queueId}

--- Pagination Info ---
Page Number: N/A
Page Size: N/A
Total Pages: N/A
Total Matching Queues: N/A
`.trim(),
        },
      ],
    });
  });
});
