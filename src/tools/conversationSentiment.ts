import { z } from "zod";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import type {
  SpeechTextAnalyticsApi,
  Models,
} from "purecloud-platform-client-v2";
import { errorResult } from "./utils/errorResult.js";

export interface ToolDependencies {
  readonly speechTextAnalyticsApi: Pick<
    SpeechTextAnalyticsApi,
    "getSpeechandtextanalyticsConversation"
  >;
}

const paramsSchema = z.object({
  conversationIds: z
    .array(
      z
        .string()
        .uuid()
        .describe(
          "A UUID ID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)",
        ),
    )
    .min(1)
    .max(100)
    .describe("A list of up to 100 conversation IDs to retrieve sentiment for"),
});

function interpretSentiment(score?: number): string {
  if (score === undefined) return "Unknown";
  if (score > 55) return "Positive";
  if (score >= 20 && score <= 55) return "Slightly Positive";
  if (score > -20 && score < 20) return "Neutral";
  if (score >= -55 && score <= -20) return "Slightly Negative";
  return "Negative";
}

export const conversationSentiment: ToolFactory<
  ToolDependencies,
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
      const conversations: Models.ConversationMetrics[] = [];
      try {
        conversations.push(
          ...(await Promise.all(
            conversationIds.map((id) =>
              speechTextAnalyticsApi.getSpeechandtextanalyticsConversation(id),
            ),
          )),
        );
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve sentiment analysis: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve sentiment analysis: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }

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
    },
  });
