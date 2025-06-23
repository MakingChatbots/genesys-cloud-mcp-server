import { type ApiClientClass } from "purecloud-platform-client-v2";
import { type ToolCall } from "../tools/utils/createTool.js";
import { ConfigRetriever } from "../createConfigRetriever.js";
import { errorResult } from "../tools/utils/errorResult.js";
import { z } from "zod";

let isAuthenticated = false;

type AuthResult =
  | { authenticated: true }
  | { authenticated: false; reason: string };

async function authenticate(
  apiClient: ApiClientClass,
  configRetriever: ConfigRetriever,
): Promise<AuthResult> {
  const config = configRetriever.getGenesysCloudConfig();
  if (!config.success) {
    return { authenticated: false, reason: config.reason };
  }
  const authConfig = config.value;

  try {
    apiClient.setEnvironment(authConfig.region);
    await apiClient.loginClientCredentialsGrant(
      authConfig.oAuthClientId,
      authConfig.oAuthClientSecret,
    );
  } catch (e: unknown) {
    return {
      authenticated: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  return {
    authenticated: true,
  };
}

export const OAuthClientCredentialsWrapper = (
  configRetriever: ConfigRetriever,
  apiClient: ApiClientClass,
) => {
  return function <Schema extends z.Schema = z.Schema>(
    call: ToolCall<Schema>,
  ): ToolCall<Schema> {
    return async (input: Schema) => {
      if (!isAuthenticated) {
        const authResult = await authenticate(apiClient, configRetriever);
        if (authResult.authenticated) {
          isAuthenticated = true;
        } else {
          return errorResult(
            `Failed to authenticate with Genesys Cloud. Reason:\n${authResult.reason}`,
          );
        }
      }

      return call(input);
    };
  };
};
