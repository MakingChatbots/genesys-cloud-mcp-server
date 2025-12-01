import type {
  AuthorizationApi,
  Models,
  OAuthApi,
} from "purecloud-platform-client-v2";
import { z } from "zod";
import { createTool, type ToolFactory } from "../utils/createTool.js";
import { errorResult } from "../utils/errorResult.js";
import { isMissingPermissionsError } from "../utils/genesys/isMissingPermissionsError.js";
import { isUnauthorisedError } from "../utils/genesys/isUnauthorisedError.js";
import { formatOAuthClientJson } from "./formatOAuthClientJson.js";

export interface ToolDependencies {
  readonly oauthApi: Pick<OAuthApi, "getOauthClients">;
  readonly authorizationApi: Pick<
    AuthorizationApi,
    "getAuthorizationDivisions" | "getAuthorizationRoles"
  >;
}

export interface RoleToDivisionsAssociation {
  id: string;
  name?: string;
  divisions: Array<{
    id: string;
    name?: string;
  }>;
}

export interface OAuthClientResponse {
  id?: string;
  name: string;
  description?: string;
  // I combine `roleIds` and `roleDivisions` from the Genesys Cloud Model into just `roles`.
  // Since `roleIds` is the authoritative list of roles associated with the OAuth Client I always want
  // `roles` to contain these IDs. I cannot guarantee there is a division associated with the role in `roleDivisions`
  // so `divisionId` is optional.
  roles?: Array<RoleToDivisionsAssociation>;
  dateCreated?: string;
  scope?: Array<string>;
  state?: string;
  dateToDelete?: string;
}

const paramsSchema = z.object({});

export const oauthClients: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ oauthApi, authorizationApi }) =>
  createTool({
    schema: {
      name: "oauth_clients",
      annotations: { title: "List OAuth Clients" },
      description:
        "Retrieves a list of all OAuth clients, including their associated roles and divisions. This tool is useful for auditing and managing OAuth clients in the Genesys Cloud organization.",
      paramsSchema,
    },
    call: async () => {
      let result: Models.OAuthClientEntityListing;
      try {
        result = await oauthApi.getOauthClients();
      } catch (error: unknown) {
        const errorMessage = isUnauthorisedError(error)
          ? "Failed to retrieve list of all OAuth clients: Unauthorised access. Please check API credentials or permissions"
          : `Failed to retrieve list of all OAuth clients: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

        return errorResult(errorMessage);
      }

      const entities = result.entities ?? [];

      let divisions: Models.AuthzDivisionEntityListing;
      try {
        // No logic to limit request size as divisions unlikely to be large
        divisions = await authorizationApi.getAuthorizationDivisions({
          pageSize: 99999,
        });
      } catch (error: unknown) {
        console.warn(
          isMissingPermissionsError(error)
            ? "Division names will not be populated.\nReason: Missing necessary permission."
            : `Division names will not be populated.\nReason: Failed to retrieve list of divisions: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
      }

      const roleIds = entities
        .flatMap((e) => e.roleIds)
        .filter((id) => id !== undefined);

      let roles: Models.OrganizationRoleEntityListing | undefined;
      try {
        roles = await authorizationApi.getAuthorizationRoles({
          id: roleIds,
          pageSize: roleIds.length,
        });
      } catch (error: unknown) {
        console.warn(
          isMissingPermissionsError(error)
            ? "Role names will not be populated.\nReason: Missing necessary permission."
            : `Role names will not be populated.\nReason: Failed to retrieve list of roles: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
      }

      const response = (result?.entities ?? []).map((e) =>
        formatOAuthClientJson(
          e,
          divisions?.entities ?? [],
          roles?.entities ?? [],
        ),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response),
          },
        ],
      };
    },
  });
