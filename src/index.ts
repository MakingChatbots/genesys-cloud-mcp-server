import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import platformClient from "purecloud-platform-client-v2";
import { withAuth } from "./withAuth.js";
import { searchQueues } from "./tools/searchQueues.js";
import { loadConfig } from "./loadConfig.js";
import { sampleConversationsByQueue } from "./tools/sampleConversationsByQueue.js";
import { queryQueueVolumes } from "./tools/queryQueueVolumes.js";
import { voiceCallQuality } from "./tools/voiceCallQuality.js";
import { conversationSentiment } from "./tools/conversationSentiment.js";

const configResult = loadConfig(process.env);
if (!configResult.success) {
  console.error(configResult.reason);
  process.exit(1);
}

const config = configResult.config;

const server: McpServer = new McpServer({
  name: "Genesys Cloud",
  version: "0.0.1",
});

const searchQueuesTool = searchQueues({
  routingApi: new platformClient.RoutingApi(),
});
server.tool(
  searchQueuesTool.schema.name,
  searchQueuesTool.schema.description,
  searchQueuesTool.schema.paramsSchema.shape,
  config.mockingEnabled
    ? searchQueuesTool.mockCall
    : withAuth(
        searchQueuesTool.call,
        config.genesysCloud,
        platformClient.ApiClient.instance,
      ),
);

const queryConversationsByQueueTool = sampleConversationsByQueue({
  analyticsApi: new platformClient.AnalyticsApi(),
});
server.tool(
  queryConversationsByQueueTool.schema.name,
  queryConversationsByQueueTool.schema.description,
  queryConversationsByQueueTool.schema.paramsSchema.shape,
  config.mockingEnabled
    ? queryConversationsByQueueTool.mockCall
    : withAuth(
        queryConversationsByQueueTool.call,
        config.genesysCloud,
        platformClient.ApiClient.instance,
      ),
);

const queryQueueVolumesTool = queryQueueVolumes({
  analyticsApi: new platformClient.AnalyticsApi(),
});
server.tool(
  queryQueueVolumesTool.schema.name,
  queryQueueVolumesTool.schema.description,
  queryQueueVolumesTool.schema.paramsSchema.shape,
  config.mockingEnabled
    ? queryQueueVolumesTool.mockCall
    : withAuth(
        queryQueueVolumesTool.call,
        config.genesysCloud,
        platformClient.ApiClient.instance,
      ),
);

const voiceCallQualityTool = voiceCallQuality({
  analyticsApi: new platformClient.AnalyticsApi(),
});
server.tool(
  voiceCallQualityTool.schema.name,
  voiceCallQualityTool.schema.description,
  voiceCallQualityTool.schema.paramsSchema.shape,
  config.mockingEnabled
    ? voiceCallQualityTool.mockCall
    : withAuth(
        voiceCallQualityTool.call,
        config.genesysCloud,
        platformClient.ApiClient.instance,
      ),
);

const conversationSentimentTool = conversationSentiment({
  speechTextAnalyticsApi: new platformClient.SpeechTextAnalyticsApi(),
});
server.tool(
  conversationSentimentTool.schema.name,
  conversationSentimentTool.schema.description,
  conversationSentimentTool.schema.paramsSchema.shape,
  config.mockingEnabled
    ? conversationSentimentTool.mockCall
    : withAuth(
        conversationSentimentTool.call,
        config.genesysCloud,
        platformClient.ApiClient.instance,
      ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
