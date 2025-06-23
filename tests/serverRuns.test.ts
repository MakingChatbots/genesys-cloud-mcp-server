import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { join } from "path";
import { execSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

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

  test("server runs via cli", async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--inspect", join(__dirname, "../dist/cli.js")],
      env: {
        PATH: process.env.PATH!,
      },
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  test("server runs via npx", async () => {
    execSync("npm link", { stdio: "inherit" });
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["--no-install", "@makingchatbots/genesys-cloud-mcp-server"],
      env: {
        PATH: process.env.PATH!,
      },
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });

  test("calling tool errors if not OAuth config", async () => {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--inspect", join(__dirname, "../dist/cli.js")],
      env: {
        PATH: process.env.PATH!,
      },
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    const result = await client.callTool({
      name: "search_queues",
      arguments: {
        name: "*TEST*",
      },
    });
    const textContext = (result as CallToolResult).content[0].text;
    expect(textContext).toStrictEqual(
      `
Failed to authenticate with Genesys Cloud. Reason:
Failed to parse environment variables
Missing environment variable: GENESYSCLOUD_REGION
Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_ID
Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_SECRET`.trim(),
    );
  });
});
