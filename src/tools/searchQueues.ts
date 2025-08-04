import { z } from "zod";
import type { Models, RoutingApi } from "purecloud-platform-client-v2";
import { isUnauthorisedError } from "./utils/genesys/isUnauthorisedError.js";
import { createTool, type ToolFactory } from "./utils/createTool.js";
import { paginationSection } from "./utils/paginationSection.js";
import { errorResult } from "./utils/errorResult.js";

type PartRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

function hasIdAndName(
  queue: Models.Queue,
): queue is PartRequired<Models.Queue, "id" | "name"> {
  return queue.id !== undefined && queue.name !== undefined;
}

export interface ToolDependencies {
  readonly routingApi: Pick<RoutingApi, "getRoutingQueues">;
}

export interface SearchQueuesResponse {
  queues: {
    name: string;
    id: string;
    description?: string;
    memberCount?: number;
  }[];
  pagination: {
    totalMatchingQueues: string | number;
    pageNumber: string | number;
    pageSize: string | number;
    totalPages: string | number;
  };
}

function formatQueuesJson(
  queues: PartRequired<Models.Queue, "id" | "name">[],
  pagination: {
    pageNumber?: number;
    pageSize?: number;
    pageCount?: number;
    totalHits?: number;
  },
): SearchQueuesResponse {
  return {
    queues: queues.map((q) => ({
      name: q.name,
      id: q.id,
      ...(q.description ? { description: q.description } : {}),
      ...(q.memberCount !== undefined ? { memberCount: q.memberCount } : {}),
    })),
    pagination: paginationSection("totalMatchingQueues", pagination),
  };
}

const paramsSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "The name (or partial name) of the routing queue(s) to search for. Wildcards ('*') are supported for pattern matching (e.g., 'Support*', '*Emergency', '*Sales*'). Use '*' alone to retrieve all queues",
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
    .max(500)
    .optional()
    .describe(
      "The maximum number of queues to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 500",
    ),
});

export const searchQueues: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ routingApi }) =>
  createTool({
    schema: {
      name: "search_queues",
      annotations: { title: "Search Queues" },
      description:
        "Searches for routing queues based on their name, allowing for wildcard searches. Returns a paginated list of matching queues, including their Name, ID, Description (if available), and Member Count (if available). Also provides pagination details like current page, page size, total results found, and total pages available. Useful for finding specific queue IDs, checking queue configurations, or listing available queues.",
      paramsSchema,
    },
    call: async ({ name, pageNumber = 1, pageSize = 100 }) => {
      let result: Models.QueueEntityListing;
      try {
        result = await routingApi.getRoutingQueues({
          name,
          pageSize: pageSize,
          pageNumber: pageNumber,
        });
      } catch (error: unknown) {
        const errorMessage = isUnauthorisedError(error)
          ? "Failed to search queues: Unauthorised access. Please check API credentials or permissions"
          : `Failed to search queues: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(errorMessage);
      }
      const entities = result.entities ?? [];

      const foundQueues = entities.filter(hasIdAndName);

      const response: SearchQueuesResponse = formatQueuesJson(foundQueues, {
        pageNumber: entities.length === 0 ? 0 : result.pageNumber,
        pageSize: entities.length === 0 ? 0 : result.pageSize,
        pageCount: entities.length === 0 ? 0 : result.pageCount,
        totalHits: entities.length === 0 ? 0 : result.total,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    },
  });
