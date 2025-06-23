import { z } from "zod";
import type { AnalyticsApi, Models } from "purecloud-platform-client-v2";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { errorResult } from "./utils/errorResult.js";

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
      description:
        "Retrieves voice call quality metrics for one or more conversations by ID. This tool specifically focuses on voice interactions and returns the minimum Mean Opinion Score (MOS) observed in each conversation, helping identify degraded or poor-quality voice calls.",
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

      const output: string[] = [
        "Call Quality Report for voice conversations.",
        "",
        "MOS Quality Legend:",
        "  Poor:       MOS < 3.5",
        "  Acceptable: 3.5 ≤ MOS < 4.3",
        "  Excellent:  MOS ≥ 4.3",
        "",
      ];

      for (const convo of conversationDetails.conversations ?? []) {
        if (!convo.conversationId || !convo.mediaStatsMinConversationMos) {
          continue;
        }

        const mos = convo.mediaStatsMinConversationMos;
        let qualityLabel = "Unknown";

        if (mos < 3.5) {
          qualityLabel = "Poor";
        } else if (mos < 4.3) {
          qualityLabel = "Acceptable";
        } else {
          qualityLabel = "Excellent";
        }

        output.push(
          `• Conversation ID: ${convo.conversationId}\n  • Minimum MOS: ${mos.toFixed(2)} (${qualityLabel})`,
        );
      }

      return {
        content: [
          {
            type: "text",
            text:
              output.length > 0
                ? [
                    `Call Quality Report for ${String(conversationIds.length)} conversation(s):`,
                    ...output,
                  ].join("\n")
                : "No valid call quality data found for the given conversation IDs.",
          },
        ],
      };
    },
  });
