import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { join } from "path";
import { execSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("Server Runs", () => {
  let client: Client | null = null;

  beforeAll(() => {
    execSync("npm run build", { stdio: "inherit" });
  });

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
      "search_voice_conversations",
      "conversation_transcript",
    ]);
  });
});
