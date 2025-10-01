import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { vi } from "vitest";
import type {
  CallToolRequestParams,
  CallToolTrace,
} from "./callToolInterceptor.js";

export function spyOnClientCallTool(client: Client) {
  const spy = vi.spyOn(client, "callTool");

  return {
    spy,
    tracesFromCallTools: (): Promise<CallToolTrace[]> =>
      Promise.all(
        spy.mock.calls.map(async (args, i) => {
          const request: CallToolRequestParams = args[0];
          const result: unknown = await spy.mock.results[i]?.value;
          return {
            request,
            result: CallToolResultSchema.parse(result),
          };
        }),
      ),
  };
}
