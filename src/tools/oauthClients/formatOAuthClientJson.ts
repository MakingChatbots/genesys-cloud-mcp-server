import type { Models } from "purecloud-platform-client-v2";
import type {
  OAuthClientResponse,
  RoleToDivisionsAssociation,
} from "./oauthClients.js";

type RoleId = string;
type DivisionId = string;

function combineRolesAndDivisions(
  client: Models.OAuthClientListing,
  availableDivisions: Models.AuthzDivision[],
  availableRoles: Models.DomainOrganizationRole[],
): RoleToDivisionsAssociation[] {
  // 1. Create pre-populated Role Map
  const roles = new Map<RoleId, Set<DivisionId>>(
    client.roleIds?.map((r) => [r, new Set<DivisionId>()]),
  );

  // 2. Enrich each Role ID with associated Divisions
  for (const roleDivision of client.roleDivisions ?? []) {
    const role = roles.get(roleDivision.roleId);
    if (role) {
      role.add(roleDivision.divisionId);
    } else {
      roles.set(roleDivision.roleId, new Set(roleDivision.divisionId));
    }
  }

  // 3. Format into model tool will return
  // 3.1 Try to associate names of role and division if available
  return Array.from(roles.entries()).map(
    ([roleId, divisionIds]): RoleToDivisionsAssociation => {
      const roleName = availableRoles.find((d) => d.id === roleId)?.name;

      return {
        id: roleId,
        name: roleName,
        divisions: Array.from(divisionIds.values()).map((divisionId) => {
          const divisionName = availableDivisions.find(
            (d) => d.id === divisionId,
          )?.name;

          return {
            id: divisionId,
            name: divisionName,
          };
        }),
      };
    },
  );
}

export function formatOAuthClientJson(
  client: Models.OAuthClientListing,
  availableDivisions: Models.AuthzDivision[],
  availableRoles: Models.DomainOrganizationRole[],
): OAuthClientResponse {
  return {
    id: client.id,
    name: client.name,
    description: client.description,
    roles: combineRolesAndDivisions(client, availableDivisions, availableRoles),
    dateCreated: client.dateCreated,
    scope: client.scope,
    state: client.state,
    dateToDelete: client.dateToDelete,
  };
}
