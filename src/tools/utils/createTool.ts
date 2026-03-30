import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export interface ToolSchema<Schema extends z.ZodType> {
  name: string;
  annotations: ToolAnnotations;
  description: string;
  paramsSchema: Schema;
}

export type ToolCall<Schema extends z.ZodType> = (
  params: z.output<Schema>,
) => Promise<CallToolResult>;

export interface ToolDefinition<Schema extends z.ZodType = z.ZodType> {
  schema: ToolSchema<Schema>;
  call: ToolCall<Schema>;
}

export type ToolFactory<Deps, Schema extends z.ZodType> = (
  deps: Deps,
) => ToolDefinition<Schema>;

export function createTool<Schema extends z.ZodType>(
  tool: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return tool;
}
