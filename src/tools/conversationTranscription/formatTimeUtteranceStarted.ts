import { intervalToDuration } from "date-fns/intervalToDuration";
import type { Utterance } from "./Utterance.js";

function zeroPad(num: number): string {
  return String(num).padStart(2, "0");
}

export function formatTimeUtteranceStarted(
  utterance: Utterance,
  defaultFormattedTime = "--:--",
): string {
  if (utterance.times) {
    const duration = intervalToDuration({
      start: utterance.times.conversationStartInMs,
      end: utterance.times.utteranceStartInMs,
    });

    return `${zeroPad(duration.minutes ?? 0)}:${zeroPad(duration.seconds ?? 0)}`;
  }

  return defaultFormattedTime;
}
