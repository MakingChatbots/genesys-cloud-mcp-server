import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function errorResult(errorMessage: string): CallToolResult {
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
