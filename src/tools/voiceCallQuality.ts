import { z } from "zod";
import type { AnalyticsApi, Models } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { errorResult } from "./utils/errorResult.js";

function interpretCallQuality(mos?: number): string {
  if (mos === undefined) return "Unknown";

  if (mos < 3.5) return "Poor";
  if (mos < 4.3) return "Acceptable";
  return "Excellent";
}

export interface ToolDependencies {
  readonly analyticsApi: Pick<AnalyticsApi, "getAnalyticsConversationsDetails">;
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
    .describe(
      "A list of up to 100 conversation IDs to evaluate voice call quality for",
    ),
});

export const voiceCallQuality: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ analyticsApi }) =>
  createTool({
    schema: {
      name: "voice_call_quality",
      annotations: { title: "Voice Call Quality" },
      description:
        "Retrieves voice call quality metrics for one or more conversations by ID. This tool specifically focuses on voice interactions and returns the minimum Mean Opinion Score (MOS) observed in each conversation as structured JSON. MOS is a measure of perceived audio quality based on factors such as jitter, latency, packet loss, and codec. Use the following legend to interpret MOS values:\n\n" +
        "  • Poor:       MOS < 3.5\n" +
        "  • Acceptable: 3.5 ≤ MOS < 4.3\n" +
        "  • Excellent:  MOS ≥ 4.3",
      paramsSchema,
    },
    call: async ({ conversationIds }) => {
      let conversationDetails: Models.AnalyticsConversationWithoutAttributesMultiGetResponse;
      try {
        conversationDetails =
          await analyticsApi.getAnalyticsConversationsDetails({
            id: conversationIds,
          });
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to query conversations call quality: Unauthorised access. Please check API credentials or permissions."
          : `Failed to query conversations call quality: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }

      const output: {
        conversationId: string;
        minimumMos: string;
        qualityLabel: string;
      }[] = [];

      for (const convo of conversationDetails.conversations ?? []) {
        if (!convo.conversationId || !convo.mediaStatsMinConversationMos) {
          continue;
        }

        const mos = convo.mediaStatsMinConversationMos;

        output.push({
          conversationId: convo.conversationId,
          minimumMos: mos.toFixed(2),
          qualityLabel: interpretCallQuality(mos),
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              conversations: output,
            }),
          },
        ],
      };
    },
  });
