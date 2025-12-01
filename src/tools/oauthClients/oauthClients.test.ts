import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MockedObjectDeep } from "@vitest/spy";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { oauthClients, type ToolDependencies } from "./oauthClients.js";

describe("List OAuth Clients", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      oauthApi: {
        getOauthClients: vi.fn(),
      },
      authorizationApi: {
        getAuthorizationDivisions: vi.fn(),
        getAuthorizationRoles: vi.fn(),
      },
    };

    const toolDefinition = oauthClients(toolDeps);
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
      name: "oauth_clients",
      title: undefined,
      _meta: undefined,
      annotations: {
        title: "List OAuth Clients",
      },
      description:
        "Retrieves a list of all OAuth clients, including their associated roles and divisions. This tool is useful for auditing and managing OAuth clients in the Genesys Cloud organization.",
      inputSchema: {
        properties: {},
        type: "object",
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
    });
  });

  test("error from Genesys Cloud's Platform SDK returned when getting OAuth Clients", async () => {
    toolDeps.oauthApi.getOauthClients.mockRejectedValue(
      new Error("Test Error Message"),
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {},
    });

    expect(result).toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            errorMessage:
              "Failed to retrieve list of all OAuth clients: Test Error Message",
          }),
        },
      ],
    });
  });

  test("error from Genesys Cloud returned when getting OAuth Clients", async () => {
    const userId = randomUUID();
    const clientId = randomUUID();
    const roleId = randomUUID();
    const divisionId = randomUUID();

    toolDeps.oauthApi.getOauthClients.mockResolvedValue({
      entities: [
        {
          id: clientId,
          name: "Test OAuth Client",
          description: "Test OAuth Client",
          roleIds: [roleId],
          dateCreated: "2024-01-01T00:00:00Z",
          createdBy: {
            id: userId,
            selfUri: `/api/v2/users/${userId}`,
          },
          roleDivisions: [
            {
              roleId,
              divisionId,
            },
          ],
          state: "active",
        },
      ],
    });

    toolDeps.authorizationApi.getAuthorizationDivisions.mockRejectedValue(
      new Error("Test Error Message"),
    );
    toolDeps.authorizationApi.getAuthorizationRoles.mockRejectedValue(
      new Error("Test Error Message"),
    );

    const result = await client.callTool({
      name: toolName,
      arguments: {},
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              id: clientId,
              name: "Test OAuth Client",
              description: "Test OAuth Client",
              roles: [
                {
                  id: roleId,
                  divisions: [{ id: divisionId }],
                },
              ],
              dateCreated: "2024-01-01T00:00:00Z",
              state: "active",
            },
          ]),
        },
      ],
    });
  });

  test("oauth clients listed with associated role/division names", async () => {
    const userId = randomUUID();
    const clientId = randomUUID();
    const roleId = randomUUID();
    const divisionId = randomUUID();

    toolDeps.oauthApi.getOauthClients.mockResolvedValue({
      entities: [
        {
          id: clientId,
          name: "Test OAuth Client",
          description: "Test OAuth Client",
          roleIds: [roleId],
          dateCreated: "2024-01-01T00:00:00Z",
          createdBy: {
            id: userId,
            selfUri: `/api/v2/users/${userId}`,
          },
          roleDivisions: [
            {
              roleId,
              divisionId,
            },
          ],
          state: "active",
        },
      ],
    });

    toolDeps.authorizationApi.getAuthorizationDivisions.mockResolvedValue({
      entities: [
        {
          id: divisionId,
          name: "Test Division",
          description: "Test Division",
          homeDivision: false,
          selfUri: `/api/v2/authorization/divisions/${divisionId}`,
        },
      ],
    });

    toolDeps.authorizationApi.getAuthorizationRoles.mockResolvedValue({
      entities: [
        {
          id: roleId,
          name: "Test Role",
          description: "Test Role",
        },
      ],
    });

    const result = await client.callTool({
      name: toolName,
      arguments: {},
    });

    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              id: clientId,
              name: "Test OAuth Client",
              description: "Test OAuth Client",
              roles: [
                {
                  id: roleId,
                  name: "Test Role",
                  divisions: [
                    {
                      id: divisionId,
                      name: "Test Division",
                    },
                  ],
                },
              ],
              dateCreated: "2024-01-01T00:00:00Z",
              state: "active",
            },
          ]),
        },
      ],
    });
  });
});
