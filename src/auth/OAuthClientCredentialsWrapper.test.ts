import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClientClass } from "purecloud-platform-client-v2";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ConfigRetriever } from "../createConfigRetriever.js";
import { OAuthClientCredentialsWrapper } from "./OAuthClientCredentialsWrapper.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const MARGIN_MS = 5 * 60 * 1000;

const okResult: CallToolResult = { content: [{ type: "text", text: "ok" }] };

describe("OAuthClientCredentialsWrapper", () => {
  let clock: number;
  let apiClient: {
    authData: { accessToken?: string; tokenExpiryTime?: number };
    setEnvironment: ReturnType<typeof vi.fn>;
    loginClientCredentialsGrant: ReturnType<typeof vi.fn>;
  };
  const configRetriever: ConfigRetriever = {
    getGenesysCloudConfig: () => ({
      success: true,
      value: {
        region: "mypurecloud.com",
        oAuthClientId: "id",
        oAuthClientSecret: "secret",
      },
    }),
  };

  const wrap = () =>
    OAuthClientCredentialsWrapper(
      configRetriever,
      apiClient as unknown as ApiClientClass,
      { refreshMarginMs: MARGIN_MS, now: () => clock },
    )(vi.fn(async () => okResult));

  beforeEach(() => {
    clock = 1_000_000;
    apiClient = {
      authData: {},
      setEnvironment: vi.fn(),
      // Mirrors the SDK: stores the token and now + expires_in on authData.
      loginClientCredentialsGrant: vi.fn(async () => {
        apiClient.authData.accessToken = `token-${clock}`;
        apiClient.authData.tokenExpiryTime = clock + DAY_MS;
      }),
    };
  });

  test("logs in once and reuses the token while it is fresh", async () => {
    const tool = wrap();
    await tool({});
    clock += DAY_MS / 2;
    await tool({});
    expect(apiClient.loginClientCredentialsGrant).toHaveBeenCalledTimes(1);
  });

  test("logs in again once the token is within the margin of expiry", async () => {
    const tool = wrap();
    await tool({});
    clock += DAY_MS - MARGIN_MS;
    const result = await tool({});
    expect(apiClient.loginClientCredentialsGrant).toHaveBeenCalledTimes(2);
    expect(result).toEqual(okResult);
  });

  test("concurrent calls share a single login", async () => {
    const tool = wrap();
    await Promise.all([tool({}), tool({}), tool({})]);
    expect(apiClient.loginClientCredentialsGrant).toHaveBeenCalledTimes(1);
  });

  test("a failed login is retried on the next call", async () => {
    apiClient.loginClientCredentialsGrant.mockRejectedValueOnce(
      new Error("boom"),
    );
    const tool = wrap();
    const failed = await tool({});
    expect(failed.isError).toBe(true);
    const ok = await tool({});
    expect(ok).toEqual(okResult);
    expect(apiClient.loginClientCredentialsGrant).toHaveBeenCalledTimes(2);
  });
});
