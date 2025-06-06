import { z } from "zod";
import type {
  AnalyticsApi,
  Models,
  SpeechTextAnalyticsApi,
} from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "../utils/createTool.js";
import { errorResult } from "../utils/errorResult.js";
import { isUnauthorisedError } from "../utils/genesys/isUnauthorisedError.js";
import { chunks } from "./chunks.js";

export interface ToolDependencies {
  readonly speechTextAnalyticsApi: Pick<
    SpeechTextAnalyticsApi,
    "getSpeechandtextanalyticsTopics"
  >;
  readonly analyticsApi: Pick<
    AnalyticsApi,
    | "getAnalyticsConversationDetails"
    | "postAnalyticsTranscriptsAggregatesQuery"
  >;
}

const MAX_IDS_ALLOWED_BY_API = 50;

const paramsSchema = z.object({
  conversationId: z
    .string()
    .uuid()
    .describe(
      "A UUID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)",
    ),
});

export const conversationTopics: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ speechTextAnalyticsApi, analyticsApi }) =>
  createTool({
    schema: {
      name: "conversation_topics",
      description:
        "Retrieves Speech and Text Analytics topics detected for a specific conversation. Topics represent business-level intents (e.g. cancellation, billing enquiry) inferred from recognised phrases in the customer-agent interaction.",
      paramsSchema,
    },
    call: async ({ conversationId }) => {
      let conversationDetails: Models.AnalyticsConversationWithoutAttributes;

      try {
        conversationDetails =
          await analyticsApi.getAnalyticsConversationDetails(conversationId);
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve conversation topics: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve conversation topics: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }

      if (
        !conversationDetails.conversationStart ||
        !conversationDetails.conversationEnd
      ) {
        return errorResult(
          "Unable to find conversation Start and End date needed for retrieving topics",
        );
      }

      // Widen the time range either side to ensure the conversation timeframe is enclosed.
      // Conversation not returned if either only partially covered by interval, or matched exactly.
      const startDate = new Date(conversationDetails.conversationStart);
      startDate.setMinutes(startDate.getMinutes() - 10);

      const endDate = new Date(conversationDetails.conversationEnd);
      endDate.setMinutes(endDate.getMinutes() + 10);

      let jobDetails: Models.TranscriptAggregateQueryResponse;
      try {
        jobDetails = await analyticsApi.postAnalyticsTranscriptsAggregatesQuery(
          {
            interval: `${startDate.toISOString()}/${endDate.toISOString()}`,
            filter: {
              type: "and",
              predicates: [
                {
                  dimension: "conversationId",
                  value: conversationId,
                },
                {
                  dimension: "resultsBy",
                  value: "communication",
                },
              ],
            },
            groupBy: ["topicId"],
            metrics: ["nTopicCommunications"],
          },
        );
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve conversation topics: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve conversation topics: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }

      const topicIds = new Set<string>();

      for (const result of jobDetails.results ?? []) {
        if (result.group?.topicId) {
          topicIds.add(result.group.topicId);
        }
      }

      if (topicIds.size === 0) {
        return {
          content: [
            {
              type: "text",
              text: `Conversation ID: ${conversationId}\nNo detected topics for this conversation.`,
            },
          ],
        };
      }

      const topics: Models.ListedTopic[] = [];

      try {
        for (const topicIdChunk of chunks(
          Array.from(topicIds.values()),
          MAX_IDS_ALLOWED_BY_API,
        )) {
          const topicsListings =
            await speechTextAnalyticsApi.getSpeechandtextanalyticsTopics({
              ids: topicIdChunk,
              pageSize: MAX_IDS_ALLOWED_BY_API,
            });

          topics.push(...(topicsListings.entities ?? []));
        }
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to retrieve conversation topics: Unauthorised access. Please check API credentials or permissions."
          : `Failed to retrieve conversation topics: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }

      const topicNames = topics
        .filter((topic) => topic.name && topic.description)
        .map(({ name, description }) => ({
          name: name ?? "",
          description: description ?? "",
        }));

      return {
        content: [
          {
            type: "text",
            text: [
              `Conversation ID: ${conversationId}`,
              "Detected Topics:",
              ...topicNames.map(
                ({ name, description }) => ` • ${name}: ${description}`,
              ),
            ].join("\n"),
          },
        ],
      };
    },
  });
