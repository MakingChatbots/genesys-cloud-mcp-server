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
import { conversationTopics } from "./tools/conversationTopics.js";

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

const routingApi = new platformClient.RoutingApi();
const analyticsApi = new platformClient.AnalyticsApi();
const speechTextAnalyticsApi = new platformClient.SpeechTextAnalyticsApi();

const searchQueuesTool = searchQueues({ routingApi });
server.tool(
  searchQueuesTool.schema.name,
  searchQueuesTool.schema.description,
  searchQueuesTool.schema.paramsSchema.shape,
  withAuth(
    searchQueuesTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const sampleConversationsByQueueTool = sampleConversationsByQueue({
  analyticsApi,
});
server.tool(
  sampleConversationsByQueueTool.schema.name,
  sampleConversationsByQueueTool.schema.description,
  sampleConversationsByQueueTool.schema.paramsSchema.shape,
  withAuth(
    sampleConversationsByQueueTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const queryQueueVolumesTool = queryQueueVolumes({ analyticsApi });
server.tool(
  queryQueueVolumesTool.schema.name,
  queryQueueVolumesTool.schema.description,
  queryQueueVolumesTool.schema.paramsSchema.shape,
  withAuth(
    queryQueueVolumesTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const voiceCallQualityTool = voiceCallQuality({ analyticsApi });
server.tool(
  voiceCallQualityTool.schema.name,
  voiceCallQualityTool.schema.description,
  voiceCallQualityTool.schema.paramsSchema.shape,
  withAuth(
    voiceCallQualityTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const conversationSentimentTool = conversationSentiment({
  speechTextAnalyticsApi,
});
server.tool(
  conversationSentimentTool.schema.name,
  conversationSentimentTool.schema.description,
  conversationSentimentTool.schema.paramsSchema.shape,
  withAuth(
    conversationSentimentTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const conversationTopicsTool = conversationTopics({
  speechTextAnalyticsApi,
  analyticsApi,
});
server.tool(
  conversationTopicsTool.schema.name,
  conversationTopicsTool.schema.description,
  conversationTopicsTool.schema.paramsSchema.shape,
  withAuth(
    conversationTopicsTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("Started...");
