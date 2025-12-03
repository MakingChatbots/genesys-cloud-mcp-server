import type { LRUCache } from "lru-cache";
import type { Models, OAuthApi } from "purecloud-platform-client-v2";
import { z } from "zod";
import { createTool, type ToolFactory } from "../utils/createTool.js";
import { errorResult } from "../utils/errorResult.js";
import { isUnauthorisedError } from "../utils/genesys/isUnauthorisedError.js";
import { waitFor } from "../utils/waitFor.js";

const MAX_ATTEMPTS = 10;
const TOOL_CACHE_KEY = "oauthClientUsage";

export interface OAuthClientUsageResponse {
  startDate: string;
  endDate: string;
  totalRequests: number;
  requestsPerEndpoint: {
    endpoint?: string;
    requests?: number;
  }[];
}

export interface ToolDependencies {
  readonly oauthApi: Pick<
    OAuthApi,
    "postOauthClientUsageQuery" | "getOauthClientUsageQueryResult"
  >;
  readonly cache?: LRUCache<string, OAuthClientUsageResponse>;
}

const paramsSchema = z.object({
  oauthClientId: z
    .string()
    .uuid()
    .describe(
      "The UUID of the OAuth Client to retrieve the usage for (e.g., 00000000-0000-0000-0000-000000000000)",
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

export const oauthClientUsage: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ oauthApi, cache }) =>
  createTool({
    schema: {
      name: "oauth_client_usage",
      annotations: { title: "OAuth Client Usage" },
      description:
        "Retrieves the usage of an OAuth Client for a given period. It returns the total number of requests and a breakdown of requests per organization.",
      paramsSchema,
    },
    call: async ({ oauthClientId, startDate, endDate }) => {
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

      const cacheName = `${TOOL_CACHE_KEY}.${oauthClientId}-${from.getTime()}-${to.getTime()}`;

      const cachedResult = cache?.get(cacheName);
      if (cachedResult) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(cachedResult),
            },
          ],
        };
      }

      let result: Models.UsageExecutionResult;
      try {
        result = await oauthApi.postOauthClientUsageQuery(oauthClientId, {
          interval: `${from.toISOString()}/${to.toISOString()}`,
          metrics: ["Requests"],
          groupBy: ["TemplateUri", "HttpMethod"],
        });
      } catch (error: unknown) {
        const errorMessage = isUnauthorisedError(error)
          ? "Failed to retrieve usage of OAuth client: Unauthorised access. Please check API credentials or permissions"
          : `Failed to retrieve usage of OAuth client: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(errorMessage);
      }

      if (!result.executionId) {
        return errorResult(
          "Failed to get an Execution ID from Genesys Cloud's Platform API",
        );
      }

      let apiUsageQueryResult: Models.ApiUsageQueryResult | undefined;

      let state: string | undefined;
      let attempts = 0;
      while (attempts < MAX_ATTEMPTS) {
        const executionResult = await oauthApi.getOauthClientUsageQueryResult(
          result.executionId,
          oauthClientId,
        );
        state = executionResult?.queryStatus?.toUpperCase() ?? "UNKNOWN";

        if (state === "COMPLETE") {
          apiUsageQueryResult = executionResult;
          break;
        }

        switch (executionResult.queryStatus) {
          case "FAILED":
            return errorResult(
              `Failed to get usage data for OAuth Client ${oauthClientId}.`,
            );
          case "UNKNOWN":
            return errorResult(
              "Execution returned an unknown or undefined state.",
            );
        }

        await waitFor(3000);
        attempts++;
      }

      if (state !== "COMPLETE") {
        return errorResult(
          `Timed out waiting for OAuth Client usage to complete for client ${oauthClientId}.`,
        );
      }

      const toolResult: OAuthClientUsageResponse = {
        startDate,
        endDate,
        totalRequests: (apiUsageQueryResult?.results ?? []).reduce(
          (acc, curr) => acc + (curr.requests ?? 0),
          0,
        ),
        requestsPerEndpoint: (apiUsageQueryResult?.results ?? []).map(
          (result) => ({
            endpoint:
              [result.httpMethod, result.templateUri].join(" ") || undefined,
            requests: result.requests,
          }),
        ),
      };

      cache?.set(
        `${TOOL_CACHE_KEY}.${oauthClientId}-${from.getTime()}-${to.getTime()}`,
        toolResult,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(toolResult),
          },
        ],
      };
    },
  });
