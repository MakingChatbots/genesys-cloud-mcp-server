import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

export interface ToolSchema<Schema extends z.Schema> {
  name: string;
  annotations: ToolAnnotations;
  description: string;
  paramsSchema: Schema;
}

export type ToolCall<Schema extends z.Schema> = (
  params: z.output<Schema>,
) => Promise<CallToolResult>;

export interface ToolDefinition<Schema extends z.Schema = z.Schema> {
  schema: ToolSchema<Schema>;
  call: ToolCall<Schema>;
}

export type ToolFactory<Deps, Schema extends z.Schema> = (
  deps: Deps,
) => ToolDefinition<Schema>;

export function createTool<Schema extends z.Schema>(
  tool: ToolDefinition<Schema>,
): ToolDefinition<Schema> {
  return tool;
}
