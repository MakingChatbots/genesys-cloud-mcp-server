import { z } from "zod";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { type AnalyticsApi } from "purecloud-platform-client-v2";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";

interface Dependencies {
  readonly analyticsApi: AnalyticsApi;
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
      "A list of up to 100 conversation IDs to evaluate voice call quality for.",
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

export const voiceCallQuality: ToolFactory<
  Dependencies,
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
      try {
        const conversationDetails =
          await analyticsApi.getAnalyticsConversationsDetails({
            id: conversationIds,
          });

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
                    ].join("\n\n")
                  : "No valid call quality data found for the given conversation IDs.",
            },
          ],
        };
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to query conversations call quality: Unauthorised access. Please check API credentials or permissions."
          : `Failed to query conversations call quality: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(message);
      }
    },
    mockCall: async ({ conversationIds }) => {
      return Promise.resolve({
        content: [
          {
            type: "text",
            text: [
              `Call Quality Report for ${String(conversationIds.length)} conversation(s):`,
              ...conversationIds.map(
                (id, index) =>
                  `• Conversation ID: ${id}\n  • Minimum MOS: ${(3 + index * 0.5).toFixed(2)}`,
              ),
            ].join("\n\n"),
          },
        ],
      });
    },
  });
