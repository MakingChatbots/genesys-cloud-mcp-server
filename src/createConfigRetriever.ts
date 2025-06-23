import { z } from "zod";

export interface GenesysCloudConfig {
  readonly region: string;
  readonly oAuthClientId: string;
  readonly oAuthClientSecret: string;
}

export interface ConfigRetriever {
  readonly getGenesysCloudConfig: () => Result<GenesysCloudConfig>;
}

export interface SuccessResult<T> {
  success: true;
  value: T;
}

export interface ErrorResult {
  success: false;
  reason: string;
}

export type Result<T> = SuccessResult<T> | ErrorResult;

const genesysAuthConfigSchema = z.object({
  GENESYSCLOUD_REGION: z.string({
    required_error: "Missing environment variable: GENESYSCLOUD_REGION",
  }),
  GENESYSCLOUD_OAUTHCLIENT_ID: z.string({
    required_error: "Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_ID",
  }),
  GENESYSCLOUD_OAUTHCLIENT_SECRET: z.string({
    required_error:
      "Missing environment variable: GENESYSCLOUD_OAUTHCLIENT_SECRET",
  }),
});

export function createConfigRetriever(env: NodeJS.ProcessEnv): ConfigRetriever {
  return {
    getGenesysCloudConfig: () => {
      const genesysAuthConfig = genesysAuthConfigSchema.safeParse(env);
      if (!genesysAuthConfig.success) {
        const failureReason = [
          "Failed to parse environment variables",
          ...genesysAuthConfig.error.issues.map((i) => i.message),
        ].join("\n");

        return {
          success: false,
          reason: failureReason,
        };
      }

      return {
        success: true,
        value: {
          region: genesysAuthConfig.data.GENESYSCLOUD_REGION,
          oAuthClientId: genesysAuthConfig.data.GENESYSCLOUD_OAUTHCLIENT_ID,
          oAuthClientSecret:
            genesysAuthConfig.data.GENESYSCLOUD_OAUTHCLIENT_SECRET,
        },
      };
    },
  };
}
