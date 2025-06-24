import { beforeEach, describe, expect, test, vi } from "vitest";
import { type MockedObjectDeep } from "@vitest/spy";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { randomUUID } from "node:crypto";
import {
  conversationTranscription,
  type ToolDependencies,
} from "./conversationTranscription.js";
import { type TranscriptResponseFormat } from "./TranscriptResponse.js";

describe("Conversation Transcription Tool", () => {
  let toolDeps: MockedObjectDeep<ToolDependencies>;
  let client: Client;
  let toolName: string;

  beforeEach(async () => {
    toolDeps = {
      recordingApi: {
        getConversationRecordings: vi.fn(),
      },
      speechTextAnalyticsApi: {
        getSpeechandtextanalyticsConversationCommunicationTranscripturl:
          vi.fn(),
      },
      fetchUrl: vi.fn(),
    };

    const toolDefinition = conversationTranscription(toolDeps);
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
      name: "conversation_transcript",
      title: undefined,
      annotations: { title: "Conversation Transcript" },
      description:
        "Retrieves a structured transcript of the conversation, including speaker labels, utterance timestamps, and sentiment annotations where available. The transcript is formatted as a time-aligned list of utterances attributed to each participant (e.g., customer or agent)",
      inputSchema: {
        type: "object",
        properties: {
          conversationId: {
            description:
              "The UUID of the conversation to retrieve the transcript for (e.g., 00000000-0000-0000-0000-000000000000)",
            format: "uuid",
            type: "string",
          },
        },
        required: ["conversationId"],
        additionalProperties: false,

        $schema: "http://json-schema.org/draft-07/schema#",
      },
    });
  });

  test("error from Genesys Cloud's Platform SDK call 1 returned", async () => {
    toolDeps.recordingApi.getConversationRecordings.mockRejectedValue(
      new Error("Test Error Message"),
    );

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          conversationId: randomUUID(),
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Failed to retrieve transcript: Test Error Message",
        },
      ],
    });
  });

  test("error from Genesys Cloud's Platform SDK call 2 returned2", async () => {
    toolDeps.recordingApi.getConversationRecordings.mockResolvedValue([
      {
        sessionId: randomUUID(),
      },
    ]);

    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsConversationCommunicationTranscripturl.mockRejectedValue(
      new Error("Test Error Message"),
    );

    await expect(
      client.callTool({
        name: toolName,
        arguments: {
          conversationId: randomUUID(),
        },
      }),
    ).resolves.toStrictEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: "Failed to retrieve transcript: Test Error Message",
        },
      ],
    });
  });

  test("transcript returned", async () => {
    const conversationId = randomUUID();
    const sessionId = randomUUID();

    toolDeps.recordingApi.getConversationRecordings.mockResolvedValue([
      {
        sessionId,
      },
    ]);

    toolDeps.speechTextAnalyticsApi.getSpeechandtextanalyticsConversationCommunicationTranscripturl.mockResolvedValue(
      { url: "https://test.test/transcript" },
    );

    toolDeps.fetchUrl.mockResolvedValue({
      json: vi.fn<() => Promise<TranscriptResponseFormat>>().mockResolvedValue({
        conversationStartTime: new Date("2025-06-06T21:00:00.000Z").getTime(),
        participants: [
          {
            startTimeMs: new Date("2025-06-06T21:00:00.000Z").getTime(),
            endTimeMs: new Date("2025-06-06T21:00:05.000Z").getTime(),
            participantPurpose: "ivr",
          },
          {
            startTimeMs: new Date("2025-06-06T21:00:05.000Z").getTime(),
            endTimeMs: new Date("2025-06-06T21:00:10.000Z").getTime(),
            participantPurpose: "customer",
          },
        ],
        transcripts: [
          {
            phrases: [
              {
                startTimeMs: new Date("2025-06-06T21:00:00.000Z").getTime(),
                participantPurpose: "internal",
                decoratedText: "I'm an IVR",
                phraseIndex: 0,
              },
              {
                startTimeMs: new Date("2025-06-06T21:00:05.000Z").getTime(),
                participantPurpose: "external",
                decoratedText: "I'm a customer",
                phraseIndex: 1,
              },
            ],
            analytics: {
              sentiment: [
                {
                  phraseIndex: 1,
                  sentiment: 1,
                },
              ],
            },
          },
        ],
      }),
    });

    const result = await client.callTool({
      name: toolName,
      arguments: {
        conversationId,
      },
    });

    expect(toolDeps.recordingApi.getConversationRecordings).toBeCalledWith(
      conversationId,
    );

    expect(
      toolDeps.speechTextAnalyticsApi
        .getSpeechandtextanalyticsConversationCommunicationTranscripturl,
    ).toBeCalledWith(conversationId, sessionId);

    expect(toolDeps.fetchUrl).toBeCalledWith("https://test.test/transcript");

    expect(result).toStrictEqual({
      content: [
        {
          text: `
Time   Who       Sentiment  Utterance
00:00  IVR                  I'm an IVR
00:05  customer  Positive   I'm a customer
`.trim(),
          type: "text",
        },
      ],
    });
  });
});
