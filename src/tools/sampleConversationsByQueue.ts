import { z } from "zod";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { type AnalyticsApi } from "purecloud-platform-client-v2";
import { sampleEvenly } from "./utils/sampleEvenly.js";
import { waitFor } from "./utils/waitFor.js";
import { errorResult } from "./utils/errorResult.js";

export interface ToolDependencies {
  readonly analyticsApi: Pick<
    AnalyticsApi,
    | "postAnalyticsConversationsDetailsJobs"
    | "getAnalyticsConversationsDetailsJob"
    | "getAnalyticsConversationsDetailsJobResults"
  >;
}

const paramsSchema = z.object({
  queueId: z
    .string()
    .uuid()
    .describe(
      "The UUID ID of the queue to filter conversations by. (e.g., 00000000-0000-0000-0000-000000000000)",
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

const MAX_ATTEMPTS = 10;

export const sampleConversationsByQueue: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi }) =>
  createTool({
    schema: {
      name: "sample_conversations_by_queue",
      description:
        "Retrieves conversation analytics for a specific queue between two dates, returning a representative sample of conversation IDs. Useful for reporting, investigation, or summarisation.",
      paramsSchema,
    },
    call: async ({ queueId, startDate, endDate }) => {
      const from = new Date(startDate);
      const to = new Date(endDate);

      if (isNaN(from.getTime()))
        return errorResult("startDate is not a valid ISO-8601 date.");
      if (isNaN(to.getTime()))
        return errorResult("endDate is not a valid ISO-8601 date.");
      if (from >= to) return errorResult("Start date must be before end date.");
      const now = new Date();
      if (to > now) {
        to.setTime(now.getTime());
      }

      try {
        const job = await analyticsApi.postAnalyticsConversationsDetailsJobs({
          interval: `${from.toISOString()}/${to.toISOString()}`,
          order: "asc",
          orderBy: "conversationStart",
          segmentFilters: [
            {
              type: "and",
              predicates: [
                {
                  dimension: "purpose",
                  value: "customer",
                },
              ],
            },
            {
              type: "or",
              predicates: [
                {
                  dimension: "queueId",
                  value: queueId,
                },
              ],
            },
          ],
        });

        const jobId = job.jobId;
        if (!jobId)
          return errorResult("Job ID not returned from Genesys Cloud.");

        let state: string | undefined = undefined;
        let attempts = 0;
        while (attempts < MAX_ATTEMPTS) {
          const jobStatus =
            await analyticsApi.getAnalyticsConversationsDetailsJob(jobId);
          state = jobStatus.state ?? "UNKNOWN";

          console.log("UPDATE", { attempts, state });

          if (state === "FULFILLED") break;

          switch (jobStatus.state) {
            case "FAILED":
              return errorResult("Analytics job failed.");
            case "CANCELLED":
              return errorResult("Analytics job was cancelled.");
            case "EXPIRED":
              return errorResult("Analytics job results have expired.");
            case "UNKNOWN":
              return errorResult(
                "Analytics job returned an unknown or undefined state.",
              );
          }

          await waitFor(3000);
          attempts++;
        }

        if (state !== "FULFILLED") {
          return errorResult(
            "Timed out waiting for analytics job to complete.",
          );
        }

        const results =
          await analyticsApi.getAnalyticsConversationsDetailsJobResults(jobId);
        const conversationIds = (results.conversations ?? [])
          .map((c) => c.conversationId)
          .filter(Boolean);

        const sampledIds = sampleEvenly(conversationIds, 100);

        return {
          content: [
            {
              type: "text",
              text:
                sampledIds.length === 0
                  ? "No conversations found in queue during specified period."
                  : [
                      `Sample of ${String(sampledIds.length)} conversations (out of ${String(conversationIds.length)}) in the queue during that period.`,
                      "",
                      "Conversation IDs:",
                      ...sampledIds,
                    ].join("\n"),
            },
          ],
        };
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to query conversations: Unauthorised access. Please check API credentials or permissions."
          : `Failed to query conversations: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }
    },
  });
