import { z } from "zod";
import {
  Models,
  RecordingApi,
  SpeechTextAnalyticsApi,
} from "purecloud-platform-client-v2";
import { isWithinInterval } from "date-fns/isWithinInterval";
import { getBorderCharacters, table } from "table";
import { createTool, type ToolFactory } from "../utils/createTool.js";
import { isUnauthorisedError } from "../utils/genesys/isUnauthorisedError.js";
import { errorResult } from "../utils/errorResult.js";
import {
  Participant,
  Transcript,
  TranscriptResponseFormat,
} from "./TranscriptResponse.js";
import { Utterance } from "./Utterance.js";
import { formatTimeUtteranceStarted } from "./formatTimeUtteranceStarted.js";

export interface ToolDependencies {
  readonly recordingApi: Pick<RecordingApi, "getConversationRecordings">;
  readonly speechTextAnalyticsApi: Pick<
    SpeechTextAnalyticsApi,
    "getSpeechandtextanalyticsConversationCommunicationTranscripturl"
  >;
  readonly fetchUrl: (
    url: string | URL | Request,
  ) => Promise<Pick<Response, "json">>;
}

function waitSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function friendlyPurposeName(
  participantPurpose: string | undefined,
): string {
  switch (participantPurpose?.toLowerCase()) {
    case "internal":
      return "Agent";
    case "external":
      return "Customer";
    case "acd":
      return "ACD";
    case "ivr":
      return "IVR";
    default:
      return participantPurpose ?? "Unknown";
  }
}

function friendlySentiment(sentiment: number | undefined): string {
  if (sentiment === 1) {
    return "Positive";
  }

  if (sentiment === 0) {
    return "Neutral";
  }

  if (sentiment === -1) {
    return "Negative";
  }

  return "";
}

function isNonHuman(participant: Participant | undefined) {
  if (!participant?.participantPurpose) {
    return false;
  }

  return ["acd", "ivr", "voicemail", "fax"].includes(
    participant.participantPurpose.toLowerCase(),
  );
}

function isInternalParticipant(participant: Participant): boolean {
  const purpose = participant.participantPurpose?.toLowerCase();
  if (!purpose) {
    return false;
  }

  return (
    purpose === "user" ||
    purpose === "agent" ||
    purpose === "internal" ||
    isNonHuman(participant)
  );
}

function isExternalParticipant(participant: Participant): boolean {
  const purpose = participant.participantPurpose?.toLowerCase();
  if (!purpose) {
    return false;
  }

  return purpose === "external" || purpose === "customer";
}

const paramsSchema = z.object({
  conversationId: z
    .string()
    .uuid()
    .describe(
      "The UUID of the conversation to retrieve the transcript for (e.g., 00000000-0000-0000-0000-000000000000)",
    ),
});

export const conversationTranscription: ToolFactory<
  ToolDependencies,
  typeof paramsSchema
> = ({ recordingApi, speechTextAnalyticsApi, fetchUrl }) =>
  createTool({
    schema: {
      name: "conversation_transcript",
      annotations: { title: "Conversation Transcript" },
      description:
        "Retrieves a structured transcript of the conversation, including speaker labels, utterance timestamps, and sentiment annotations where available. The transcript is formatted as a time-aligned list of utterances attributed to each participant (e.g., customer or agent)",
      paramsSchema,
    },
    call: async ({ conversationId }) => {
      let recordingSessionIds: string[] | null = null;

      // 1. Unarchive recordings
      let retryCounter = 0;
      while (!recordingSessionIds) {
        let recordings: Models.Recording[] | undefined;

        try {
          recordings = (await recordingApi.getConversationRecordings(
            conversationId,
          )) as Models.Recording[] | undefined;
        } catch (error: unknown) {
          const message = isUnauthorisedError(error)
            ? "Failed to retrieve transcript: Unauthorised access. Please check API credentials or permissions."
            : `Failed to retrieve transcript: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

          return errorResult(message);
        }

        if (recordings) {
          recordingSessionIds = recordings
            .filter((s) => s.sessionId)
            .map((s) => s.sessionId) as string[];
        } else {
          retryCounter++;
          if (retryCounter > 5) {
            return errorResult("Failed to retrieve transcript.");
          }

          await waitSeconds(10);
        }
      }

      // 2. Download recordings
      const transcriptionsForRecordings: TranscriptResponseFormat[] = [];

      for (const recordingSessionId of recordingSessionIds) {
        if (!recordingSessionId) {
          continue;
        }
        let transcriptUrl: Models.TranscriptUrl | null = null;
        try {
          transcriptUrl =
            await speechTextAnalyticsApi.getSpeechandtextanalyticsConversationCommunicationTranscripturl(
              conversationId,
              recordingSessionId,
            );
        } catch (error) {
          const message = isUnauthorisedError(error)
            ? "Failed to retrieve transcript: Unauthorised access. Please check API credentials or permissions."
            : `Failed to retrieve transcript: ${error instanceof Error ? error.message : JSON.stringify(error)}`;

          return errorResult(message);
        }
        if (!transcriptUrl.url) {
          return errorResult(
            "URL for transcript was not provided for conversation",
          );
        } else {
          const response = await fetchUrl(transcriptUrl.url);
          const transcript = (await response.json()) as Transcript;

          transcriptionsForRecordings.push(transcript);
        }
      }

      const utterances: Utterance[] = [];
      for (const recording of transcriptionsForRecordings) {
        for (const transcript of recording.transcripts ?? []) {
          const transcriptUtterances = (transcript.phrases ?? []).flatMap(
            (p): Utterance => {
              const participantDetails = recording.participants?.find((pd) => {
                if (
                  p.participantPurpose !== "external" &&
                  isExternalParticipant(pd)
                ) {
                  return false; // Ignore
                }

                if (
                  p.participantPurpose !== "internal" &&
                  isInternalParticipant(pd)
                ) {
                  return false; // Ignore
                }

                if (!p.startTimeMs || !pd.startTimeMs || !pd.endTimeMs) {
                  return false; // Ignore
                }

                return isWithinInterval(p.startTimeMs, {
                  start: pd.startTimeMs,
                  end: pd.endTimeMs,
                });
              });

              const recordingTimes =
                recording.conversationStartTime && p.startTimeMs
                  ? {
                      conversationStartInMs: recording.conversationStartTime,
                      utteranceStartInMs: p.startTimeMs,
                    }
                  : null;

              const sentiment = transcript.analytics?.sentiment?.find(
                (s) => s.phraseIndex === p.phraseIndex,
              );

              return {
                times: recordingTimes,
                sentiment: sentiment?.sentiment,
                utterance: p.decoratedText ?? p.text ?? "",
                speaker: friendlyPurposeName(
                  participantDetails?.participantPurpose ??
                    p.participantPurpose,
                ),
              } as Utterance;
            },
          );

          if (transcriptUtterances.length > 0) {
            utterances.push(...transcriptUtterances);
          }
        }
      }

      const sentimentPresent = utterances.some(
        (u) => u.sentiment !== undefined,
      );

      const data = [
        [
          "Time",
          "Who",
          ...(sentimentPresent ? ["Sentiment"] : []),
          "Utterance",
        ],
        ...utterances.map((u) => {
          return [
            formatTimeUtteranceStarted(u),
            u.speaker,
            ...(sentimentPresent ? [friendlySentiment(u.sentiment)] : []),
            u.utterance,
          ];
        }),
      ];

      const utteranceTable = table(data, {
        border: getBorderCharacters("void"),
        columnDefault: {
          paddingLeft: 0,
          paddingRight: 2,
        },
        drawHorizontalLine: () => false,
      })
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim();

      return {
        content: [
          {
            type: "text",
            text: utteranceTable,
          },
        ],
      };
    },
  });
