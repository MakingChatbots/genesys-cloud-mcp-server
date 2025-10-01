import type {
  CallToolRequest,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export type CallToolRequestParams = CallToolRequest["params"];
export type CallToolResult = z.infer<typeof CallToolResultSchema>;

export interface CallToolTrace {
  request: CallToolRequestParams;
  result: CallToolResult;
}

export interface CallToolInterception<T extends boolean = boolean> {
  shouldIntercept: (call: CallToolRequestParams) => T;
  intercept: (call: CallToolRequestParams) => Promise<CallToolResult>;
}

const errorThrowingInterceptor: CallToolInterception<true> = {
  shouldIntercept: () => true,
  intercept: () => {
    throw new Error("No interceptor found");
  },
};

export function callToolInterceptor(
  interceptors: CallToolInterception[],
  defaultInterceptor: CallToolInterception<true> = errorThrowingInterceptor,
) {
  const toolCallTraces: CallToolTrace[] = [];

  return {
    async call(request: CallToolRequestParams): Promise<CallToolResult> {
      const interceptor =
        interceptors.find((i) => i.shouldIntercept(request)) ??
        defaultInterceptor;

      const result = await interceptor.intercept(request);
      toolCallTraces.push({ request, result });

      return result;
    },

    get toolCallTraces(): readonly CallToolTrace[] {
      return toolCallTraces;
    },
  };
}
