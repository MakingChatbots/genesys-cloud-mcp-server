import { z } from "zod";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { type SpeechTextAnalyticsApi } from "purecloud-platform-client-v2";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";

interface Dependencies {
  readonly speechTextAnalyticsApi: SpeechTextAnalyticsApi;
}

const paramsSchema = z.object({
  conversationIds: z
    .array(
      z
        .string()
        .uuid()
        .describe(
          "A unique ID for a Genesys Cloud conversation. Must be a valid UUID.",
        ),
    )
    .min(1)
    .max(100)
    .describe(
      "A list of up to 100 conversation IDs to retrieve sentiment for.",
    ),
});

function errorResult(errorMessage: string): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: errorMessage,
      },
    ],
  };
}

function interpretSentiment(score?: number): string {
  if (score === undefined) return "Unknown";
  if (score > 55) return "Positive";
  if (score >= 20 && score <= 55) return "Slightly Positive";
  if (score > -20 && score < 20) return "Neutral";
  if (score >= -55 && score <= -20) return "Slightly Negative";
  return "Negative";
}

export const conversationSentiment: ToolFactory<
  Dependencies,
  typeof paramsSchema
> = ({ speechTextAnalyticsApi }) =>
  createTool({
    schema: {
      name: "conversation_sentiment",
      description:
        "Retrieves sentiment analysis scores for one or more conversations. Sentiment is evaluated based on customer phrases, categorized as positive, neutral, or negative. The result includes both a numeric sentiment score (-100 to 100) and an interpreted sentiment label.",
      paramsSchema,
    },
    call: async ({ conversationIds }) => {
      try {
        const conversations = await Promise.all(
          conversationIds.map((id) =>
            speechTextAnalyticsApi.getSpeechandtextanalyticsConversation(id),
          ),
        );

        const output: string[] = [];

        for (const convo of conversations) {
          const id = convo.conversation?.id;
          const score = convo.sentimentScore;

          if (id === undefined || score === undefined) continue;
          const scaledScore = Math.round(score * 100);

          output.push(
            `• Conversation ID: ${id}\n  • Sentiment Score: ${String(scaledScore)} (${interpretSentiment(scaledScore)})`,
          );
        }

        return {
          content: [
            {
              type: "text",
              text:
                output.length > 0
                  ? [
                      `Sentiment results for ${String(output.length)} conversation(s):`,
                      ...output,
                    ].join("\n\n")
                  : "No sentiment data found for the given conversation IDs.",
            },
          ],
        };
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve sentiment analysis: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve sentiment analysis: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }
    },
    mockCall: async ({ conversationIds }) => {
      return Promise.resolve({
        content: [
          {
            type: "text",
            text: [
              `Sentiment results for ${String(conversationIds.length)} conversation(s):`,
              ...conversationIds.map((id, index) => {
                const score = [-80, 0, 25, 55, 85][index % 5];
                return `• Conversation ID: ${id}\n  • Sentiment Score: ${String(score)} (${interpretSentiment(score)})`;
              }),
            ].join("\n\n"),
          },
        ],
      });
    },
  });
