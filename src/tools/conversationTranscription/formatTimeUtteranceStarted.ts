import { Utterance } from "./Utterance.js";
import { intervalToDuration } from "date-fns/intervalToDuration";

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
