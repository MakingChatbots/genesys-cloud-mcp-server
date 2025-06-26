import { z } from "zod";
import type {
  SpeechTextAnalyticsApi,
  Models,
} from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "../utils/createTool.js";
import { isUnauthorisedError } from "../utils/genesys/isUnauthorisedError.js";
import { errorResult } from "../utils/errorResult.js";
import { isConversationNotFoundError } from "./isConversationNotFoundError.js";
import { interpretSentiment } from "./interpretSentiment.js";

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
          "A UUID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)",
        ),
    )
    .min(1)
    .max(100)
    .describe("A list of up to 100 conversation IDs to retrieve sentiment for"),
});

export const conversationSentiment: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ speechTextAnalyticsApi }) =>
  createTool({
    schema: {
      name: "conversation_sentiment",
      description:
        "Retrieves sentiment analysis scores for one or more conversations. Sentiment is evaluated based on customer phrases, categorized as positive, neutral, or negative. The result includes both a numeric sentiment score (-100 to 100) and an interpreted sentiment label.",
      annotations: { title: "Conversation Sentiment" },
      paramsSchema,
    },
    call: async ({ conversationIds }) => {
      const conversations: PromiseSettledResult<Models.ConversationMetrics>[] =
        [];

      conversations.push(
        ...(await Promise.allSettled(
          conversationIds.map((id) =>
            speechTextAnalyticsApi.getSpeechandtextanalyticsConversation(id),
          ),
        )),
      );

      const output: (
        | {
            found: true;
            conversationId: string;
            sentimentScore: number;
            sentimentDescription: string;
          }
        | { found: false; conversationId: string }
      )[] = [];

      for (const convo of conversations) {
        if (convo.status === "fulfilled") {
          const id = convo.value.conversation?.id;
          const score = convo.value.sentimentScore;

          if (id === undefined || score === undefined) continue;
          const scaledScore = Math.round(score * 100);

          output.push({
            found: true,
            conversationId: id,
            sentimentScore: scaledScore,
            sentimentDescription: interpretSentiment(scaledScore),
          });
        } else {
          const result = isConversationNotFoundError(convo.reason);
          if (result.isResourceNotFoundError && result.conversationId) {
            output.push({
              conversationId: result.conversationId,
              found: false,
            });
          } else if (isUnauthorisedError(convo.reason)) {
            return errorResult(
              "Failed to retrieve sentiment analysis: Unauthorised access. Please check API credentials or permissions.",
            );
          } else {
            // Ignore conversation
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              conversationsWithSentiment: output
                .filter((o) => o.found)
                .map((o) => ({
                  conversationId: o.conversationId,
                  sentimentScore: o.sentimentScore,
                  sentimentDescription: o.sentimentDescription,
                })),
              conversationsWithoutSentiment: output
                .filter((o) => !o.found)
                .map((o) => o.conversationId),
            }),
          },
        ],
      };
    },
  });
