import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import platformClient from "purecloud-platform-client-v2";
import { queueTools } from "./tools/queueTools";
import { z } from "zod";

const envConfigResult = z
  .object({
    GENESYSCLOUD_REGION: z.string({
      required_error: "Missing environment variable: GENESYSCLOUD_REGION",
    }),
    GENESYSCLOUD_OAUTHCLIENT_ID: z.string({
      required_error:
        "Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_ID",
    }),
    GENESYSCLOUD_OAUTHCLIENT_SECRET: z.string({
      required_error:
        "Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_SECRET",
    }),
  })
  .safeParse(process.env);

if (!envConfigResult.success) {
  console.error("Failed to parse environment variables");
  for (const issue of envConfigResult.error.issues) {
    console.error(issue.message);
  }
  process.exit(1);
}

const apiClient = platformClient.ApiClient.instance;

apiClient.setEnvironment(envConfigResult.data.GENESYSCLOUD_REGION);
await apiClient.loginClientCredentialsGrant(
  envConfigResult.data.GENESYSCLOUD_OAUTHCLIENT_ID,
  envConfigResult.data.GENESYSCLOUD_OAUTHCLIENT_SECRET,
);

const server: McpServer = new McpServer({
  name: "Genesys Cloud",
  version: "0.0.1",
});

queueTools(server, new platformClient.RoutingApi());

const transport = new StdioServerTransport();
await server.connect(transport);
