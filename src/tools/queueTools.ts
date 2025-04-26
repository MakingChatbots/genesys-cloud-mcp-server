import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Models, type RoutingApi } from "purecloud-platform-client-v2";
import { isUnauthorisedError } from "./utils/isUnauthorisedError";

type PartRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

function hasIdAndName(
  queue: Models.Queue,
): queue is PartRequired<Models.Queue, "id" | "name"> {
  return queue.id !== undefined && queue.name !== undefined;
}

export function queueTools(server: McpServer, routingApi: RoutingApi) {
  server.tool(
    "search_queues_by_name",
    "Searches a Genesys Cloud organisation for queues by name and returns the name and ID of the first 5 results.",
    {
      name: z
        .string()
        .describe("Queue name (leading and trailing asterisks allowed)"),
    },
    async ({ name }) => {
      try {
        const result = await routingApi.getRoutingQueues({ name, pageSize: 5 });
        const entities = result.entities ?? [];

        if (entities.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No queues match the name "${name}"`,
              },
            ],
          };
        }

        const foundQueues = entities
          .filter(hasIdAndName)
          .map((q) => `• ${q.name} (ID: ${q.id})`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Queues matching "${name}":\n${foundQueues}`,
            },
          ],
        };
      } catch (error: unknown) {
        const message = isUnauthorisedError(error)
          ? "Failed to search queues: unauthorised access."
          : `Failed to search queues: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      }
    },
  );
}
