import platformClient from "purecloud-platform-client-v2";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createConfigRetriever } from "./createConfigRetriever.js";
import { searchQueues } from "./tools/searchQueues.js";
import { sampleConversationsByQueue } from "./tools/sampleConversationsByQueue/sampleConversationsByQueue.js";
import { queryQueueVolumes } from "./tools/queryQueueVolumes/queryQueueVolumes.js";
import { voiceCallQuality } from "./tools/voiceCallQuality.js";
import { conversationSentiment } from "./tools/conversationSentiment/conversationSentiment.js";
import { conversationTopics } from "./tools/conversationTopics/conversationTopics.js";
import { searchVoiceConversations } from "./tools/searchVoiceConversations.js";
import { conversationTranscription } from "./tools/conversationTranscription/conversationTranscription.js";
import { OAuthClientCredentialsWrapper } from "./auth/OAuthClientCredentialsWrapper.js";

const withAuth = OAuthClientCredentialsWrapper(
  createConfigRetriever(process.env),
  platformClient.ApiClient.instance,
);

const server: McpServer = new McpServer({
  name: "Genesys Cloud",
  version: "0.0.13", // Same version as version in package.json
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
  searchQueuesTool.schema.annotations,
  withAuth(searchQueuesTool.call),
);

const sampleConversationsByQueueTool = sampleConversationsByQueue({
  analyticsApi,
});
server.tool(
  sampleConversationsByQueueTool.schema.name,
  sampleConversationsByQueueTool.schema.description,
  sampleConversationsByQueueTool.schema.paramsSchema.shape,
  sampleConversationsByQueueTool.schema.annotations,
  withAuth(sampleConversationsByQueueTool.call),
);

const queryQueueVolumesTool = queryQueueVolumes({ analyticsApi });
server.tool(
  queryQueueVolumesTool.schema.name,
  queryQueueVolumesTool.schema.description,
  queryQueueVolumesTool.schema.paramsSchema.shape,
  queryQueueVolumesTool.schema.annotations,
  withAuth(queryQueueVolumesTool.call),
);

const voiceCallQualityTool = voiceCallQuality({ analyticsApi });
server.tool(
  voiceCallQualityTool.schema.name,
  voiceCallQualityTool.schema.description,
  voiceCallQualityTool.schema.paramsSchema.shape,
  voiceCallQualityTool.schema.annotations,
  withAuth(voiceCallQualityTool.call),
);

const conversationSentimentTool = conversationSentiment({
  speechTextAnalyticsApi,
});
server.tool(
  conversationSentimentTool.schema.name,
  conversationSentimentTool.schema.description,
  conversationSentimentTool.schema.paramsSchema.shape,
  conversationSentimentTool.schema.annotations,
  withAuth(conversationSentimentTool.call),
);

const conversationTopicsTool = conversationTopics({
  speechTextAnalyticsApi,
  analyticsApi,
});
server.tool(
  conversationTopicsTool.schema.name,
  conversationTopicsTool.schema.description,
  conversationTopicsTool.schema.paramsSchema.shape,
  conversationTopicsTool.schema.annotations,
  withAuth(conversationTopicsTool.call),
);

const searchVoiceConversationsTool = searchVoiceConversations({
  analyticsApi,
});
server.tool(
  searchVoiceConversationsTool.schema.name,
  searchVoiceConversationsTool.schema.description,
  searchVoiceConversationsTool.schema.paramsSchema.shape,
  searchVoiceConversationsTool.schema.annotations,
  withAuth(searchVoiceConversationsTool.call),
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
  conversationTranscriptTool.schema.annotations,
  withAuth(conversationTranscriptTool.call),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Genesys Cloud MCP Server running on stdio");
