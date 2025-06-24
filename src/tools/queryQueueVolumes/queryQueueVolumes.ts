import { z } from "zod";
import { type AnalyticsApi } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "../utils/createTool.js";
import { isUnauthorisedError } from "../utils/genesys/isUnauthorisedError.js";
import { isQueueUsedInConvo } from "./isQueueUsedInConvo.js";
import { waitFor } from "../utils/waitFor.js";
import { errorResult } from "../utils/errorResult.js";

export interface ToolDependencies {
  readonly analyticsApi: Pick<
    AnalyticsApi,
    | "postAnalyticsConversationsDetailsJobs"
    | "getAnalyticsConversationsDetailsJob"
    | "getAnalyticsConversationsDetailsJobResults"
  >;
}

const MAX_ATTEMPTS = 10;

const paramsSchema = z.object({
  queueIds: z
    .array(
      z
        .string()
        .uuid()
        .describe(
          "A UUID for a queue. (e.g., 00000000-0000-0000-0000-000000000000)",
        ),
    )
    .min(1)
    .max(300)
    .describe("List of up to 300 queue IDs to filter conversations by"),
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

export const queryQueueVolumes: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi }) =>
  createTool({
    schema: {
      name: "query_queue_volumes",
      annotations: { title: "Query Queue Volumes" },
      description:
        "Returns a breakdown of how many conversations occurred in each specified queue between two dates. Useful for comparing workload across queues.",
      paramsSchema,
    },
    call: async ({ queueIds, startDate, endDate }) => {
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
              predicates: queueIds.map((id) => ({
                dimension: "queueId",
                value: id,
              })),
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
        const conversations = results.conversations ?? [];

        const queueConversationCount = new Map<string, number>();
        for (const convo of conversations) {
          for (const queueId of queueIds) {
            if (isQueueUsedInConvo(queueId, convo)) {
              const count = queueConversationCount.get(queueId) ?? 0;
              queueConversationCount.set(queueId, count + 1);
            }
          }
        }

        const queueBreakdown: string = [
          "Queue volume breakdown for that period:",
          ...queueIds.map((id) => {
            const totalConversations = queueConversationCount.get(id) ?? 0;
            return `Queue ID: ${id} - Total conversations: ${String(totalConversations)}`;
          }),
        ].join("\n");

        return {
          content: [
            {
              type: "text",
              text: queueBreakdown,
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
