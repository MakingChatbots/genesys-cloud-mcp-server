import { formatDistanceStrict } from "date-fns/formatDistanceStrict";
import type { AnalyticsApi, Models } from "purecloud-platform-client-v2";
import { z } from "zod";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { errorResult } from "./utils/errorResult.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { paginationSection } from "./utils/paginationSection.js";

export interface ToolDependencies {
  readonly analyticsApi: Pick<
    AnalyticsApi,
    "postAnalyticsConversationsDetailsQuery"
  >;
}

function normalisePhoneNumber(phoneNumber: string): string {
  // N.B. This appears to be what is happening within the Genesys Cloud UI,
  // although I don't know if my version is too simplistic.
  return phoneNumber.replace(/\D/g, "");
}

function createAniSegmentFilter(
  phoneNumber: string,
): Models.SegmentDetailQueryFilter {
  return {
    type: "or",
    predicates: [
      {
        dimension: "ani",
        value: normalisePhoneNumber(phoneNumber),
      },
    ],
  };
}

const paramsSchema = z.object({
  phoneNumber: z
    .string()
    .optional()
    .describe(
      "Optional. Filters results to only include conversations involving this phone number (e.g., '+440000000000')",
    ),
  pageNumber: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets",
    ),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe(
      "The maximum number of conversations to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 100",
    ),
  startDate: z
    .string()
    .describe(
      "The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')",
    ),
  endDate: z
    .string()
    .describe(
      "The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')",
    ),
});

export const searchVoiceConversations: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi }) =>
  createTool({
    schema: {
      name: "search_voice_conversations",
      annotations: { title: "Search Voice Conversations" },
      description:
        "Searches for voice conversations within a specified time window, optionally filtering by phone number. Returns a paginated list of conversation IDs and call duration for use in further analysis or tool calls.",
      paramsSchema,
    },
    call: async ({
      phoneNumber,
      startDate,
      endDate,
      pageNumber = 1,
      pageSize = 100,
    }) => {
      const from = new Date(startDate);
      const to = new Date(endDate);

      if (Number.isNaN(from.getTime()))
        return errorResult("startDate is not a valid ISO-8601 date");
      if (Number.isNaN(to.getTime()))
        return errorResult("endDate is not a valid ISO-8601 date");
      if (from >= to) return errorResult("Start date must be before end date");
      const now = new Date();
      if (to > now) {
        to.setTime(now.getTime());
      }

      let result: Models.AnalyticsConversationQueryResponse;

      try {
        result = await analyticsApi.postAnalyticsConversationsDetailsQuery({
          order: "desc",
          orderBy: "conversationStart",
          paging: { pageSize, pageNumber },
          interval: `${from.toISOString()}/${to.toISOString()}`,
          segmentFilters: [
            {
              type: "or",
              predicates: [
                {
                  dimension: "mediaType",
                  value: "voice",
                },
              ],
            },
            {
              type: "or",
              predicates: [
                {
                  dimension: "direction",
                  value: "inbound",
                },
                {
                  dimension: "direction",
                  value: "outbound",
                },
              ],
            },
            ...(phoneNumber ? [createAniSegmentFilter(phoneNumber)] : []),
          ],
          conversationFilters: [],
          evaluationFilters: [],
          surveyFilters: [],
        });
      } catch (error: unknown) {
        const errorMessage = isUnauthorisedError(error)
          ? "Failed to search conversations: Unauthorised access. Please check API credentials or permissions"
          : `Failed to search conversations: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(errorMessage);
      }

      const conversationToDurationMapping = (result.conversations ?? [])
        .filter((convo) => convo.conversationId)
        .map((conversation) => {
          let distance: string | null = null;
          if (conversation.conversationStart && conversation.conversationEnd) {
            distance = formatDistanceStrict(
              conversation.conversationStart,
              conversation.conversationEnd,
            );
          }

          return {
            conversationId: conversation.conversationId,
            ...(distance !== null ? { duration: distance } : {}),
          };
        });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              conversations: conversationToDurationMapping,
              pagination: paginationSection("totalConversationsReturned", {
                pageSize,
                pageNumber,
                totalHits: result.totalHits,
              }),
            }),
          },
        ],
      };
    },
  });
