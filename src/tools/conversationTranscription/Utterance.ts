export interface Utterance {
  speaker: string;
  utterance: string;
  sentiment?: number;
  times: {
    conversationStartInMs: number;
    utteranceStartInMs: number;
  } | null;
}
