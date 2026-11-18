import type { ApiClientClass } from "purecloud-platform-client-v2";
import type { z } from "zod";
import type { ConfigRetriever } from "../createConfigRetriever.js";
import type { ToolCall } from "../tools/utils/createTool.js";
import { errorResult } from "../tools/utils/errorResult.js";

/**
 * Re-authenticate this long before the token's reported expiry, so a call
 * that starts just before expiry doesn't run with a token that lapses mid-flight.
 */
const DEFAULT_REFRESH_MARGIN_MS = 5 * 60 * 1000;

type AuthResult =
  | { authenticated: true }
  | { authenticated: false; reason: string };

interface AuthData {
  accessToken?: string;
  tokenExpiryTime?: number;
}

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

export interface OAuthClientCredentialsWrapperOptions {
  refreshMarginMs?: number;
  now?: () => number;
}

export const OAuthClientCredentialsWrapper = (
  configRetriever: ConfigRetriever,
  apiClient: ApiClientClass,
  {
    refreshMarginMs = DEFAULT_REFRESH_MARGIN_MS,
    now = Date.now,
  }: OAuthClientCredentialsWrapperOptions = {},
) => {
  // Shared by every wrapped tool, so concurrent calls trigger a single login.
  let inFlightLogin: Promise<AuthResult> | null = null;

  const hasUsableToken = (): boolean => {
    // loginClientCredentialsGrant records the token and its expiry
    // (now + expires_in) on authData. The SDK only auto-refreshes tokens that
    // carry a refresh_token, which client-credentials tokens never do.
    const authData = (apiClient as unknown as { authData?: AuthData }).authData;
    if (!authData?.accessToken || !authData.tokenExpiryTime) {
      return false;
    }
    return now() < authData.tokenExpiryTime - refreshMarginMs;
  };

  const ensureAuthenticated = async (): Promise<AuthResult> => {
    if (hasUsableToken()) {
      return { authenticated: true };
    }
    if (!inFlightLogin) {
      inFlightLogin = authenticate(apiClient, configRetriever).finally(() => {
        inFlightLogin = null;
      });
    }
    return inFlightLogin;
  };

  return <Schema extends z.ZodType = z.ZodType>(
    call: ToolCall<Schema>,
  ): ToolCall<Schema> =>
    async (input: z.output<Schema>) => {
      const authResult = await ensureAuthenticated();
      if (!authResult.authenticated) {
        return errorResult(
          `Failed to authenticate with Genesys Cloud. Reason:\n${authResult.reason}`,
        );
      }

      return call(input);
    };
};
