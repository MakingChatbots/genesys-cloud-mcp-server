import type { Models } from "purecloud-platform-client-v2";

export function isQueueUsedInConvo(
  queueId: string,
  conversation: Models.AnalyticsConversation,
): boolean {
  const result = conversation.participants?.some((p) =>
    p.sessions?.some((ses) =>
      ses.segments?.some((seg) => seg.queueId === queueId),
    ),
  );

  return Boolean(result);
}
