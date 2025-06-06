export function isConversationNotFoundError(
  obj: unknown,
):
  | { isResourceNotFoundError: true; conversationId: string | undefined }
  | { isResourceNotFoundError: false } {
  if (typeof obj === "object" && obj !== null) {
    const maybe = obj as {
      code?: unknown;
      messageParams?: { id?: unknown };
    };

    const resourceNotFoundError =
      typeof maybe.code === "string" && maybe.code === "resource.not.found";

    const subjectConversationId =
      typeof maybe.messageParams?.id === "string"
        ? maybe.messageParams.id
        : undefined;

    if (resourceNotFoundError) {
      return {
        isResourceNotFoundError: true,
        conversationId: subjectConversationId,
      };
    }
  }
  return { isResourceNotFoundError: false };
}
