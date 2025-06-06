import platformClient from "purecloud-platform-client-v2";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { withAuth } from "./withAuth.js";
import { loadConfig } from "./loadConfig.js";
import { searchQueues } from "./tools/searchQueues.js";
import { sampleConversationsByQueue } from "./tools/sampleConversationsByQueue/sampleConversationsByQueue.js";
import { queryQueueVolumes } from "./tools/queryQueueVolumes/queryQueueVolumes.js";
import { voiceCallQuality } from "./tools/voiceCallQuality.js";
import { conversationSentiment } from "./tools/conversationSentiment/conversationSentiment.js";
import { conversationTopics } from "./tools/conversationTopics/conversationTopics.js";
import { searchVoiceConversations } from "./tools/searchVoiceConversations.js";
import { conversationTranscription } from "./tools/conversationTranscription/conversationTranscription.js";

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
const recordingApi = new platformClient.RecordingApi();

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

const searchVoiceConversationsTool = searchVoiceConversations({
  analyticsApi,
});
server.tool(
  searchVoiceConversationsTool.schema.name,
  searchVoiceConversationsTool.schema.description,
  searchVoiceConversationsTool.schema.paramsSchema.shape,
  withAuth(
    searchVoiceConversationsTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const conversationTranscriptTool = conversationTranscription({
  recordingApi,
  speechTextAnalyticsApi,
  fetchUrl: fetch,
});
server.tool(
  conversationTranscriptTool.schema.name,
  conversationTranscriptTool.schema.description,
  conversationTranscriptTool.schema.paramsSchema.shape,
  withAuth(
    conversationTranscriptTool.call,
    config.genesysCloud,
    platformClient.ApiClient.instance,
  ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("Started...");
