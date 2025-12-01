/**
 * Checks if an object is a Missing Permissions error.
 */
export function isMissingPermissionsError(obj: unknown): boolean {
  if (typeof obj === "object" && obj !== null) {
    const error = obj as { code?: string; status?: number };

    if (error.code && error.status) {
      return error.code === "missing.any.permissions" && error.status === 403;
    }
  }
  return false;
}
