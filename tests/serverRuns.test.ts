import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from "path";
import { afterEach, describe, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

describe("Server Runs", () => {
  let client: Client | null = null;

  afterEach(async () => {
    if (client) await client.close();
  });

  test("server returns list of tools", async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--inspect", join(__dirname, "../dist/index.js")],
      env: {
        // Provides path for node binary to be used in test
        PATH: process.env.PATH!,
        GENESYSCLOUD_REGION: "test-value",
        GENESYSCLOUD_OAUTHCLIENT_ID: "test-value",
        GENESYSCLOUD_OAUTHCLIENT_SECRET: "test-value",
      },
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name)).toStrictEqual([
      "search_queues",
      "sample_conversations_by_queue",
      "query_queue_volumes",
      "voice_call_quality",
      "conversation_sentiment",
      "conversation_topics",
    ]);
  });

  // Skipped as used for local testing
  test.skip("tool call succeeds", async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--inspect", join(__dirname, "../dist/index.js")],
      env: {
        // Provides path for node binary to be used in test
        PATH: process.env.PATH!,
        GENESYSCLOUD_REGION: process.env.GENESYSCLOUD_REGION!,
        GENESYSCLOUD_OAUTHCLIENT_ID: process.env.GENESYSCLOUD_OAUTHCLIENT_ID!,
        GENESYSCLOUD_OAUTHCLIENT_SECRET:
          process.env.GENESYSCLOUD_OAUTHCLIENT_SECRET!,
      },
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    const result = await client.callTool({
      name: "voice_call_quality",
      arguments: {
        conversationIds: [randomUUID()],
      },
    });

    const toolCallResult = result as CallToolResult;

    if (!toolCallResult.content) {
      expect.fail("Tool call expected to contain content");
    }

    const text = toolCallResult.content[0].text;
    expect(text).toStrictEqual({});
  });
});
