// Transcript Schema: https://developer.genesys.cloud/analyticsdatamanagement/speechtextanalytics/transcript-url#transcript-schema
// Converted to types using: https://transform.tools/json-schema-to-typescript
// Then manually modified because of some odd typing choices by autogen and added missing properties

export type Duration = Record<string, unknown>;

export interface Phrase {
  phraseIndex?: number;
  participantPurpose?: string;
  text?: string;
  decoratedText?: string; // Manually added. Missing from Genesys Cloud schema
  stability?: number;
  confidence?: number;
  offset?: Offset;
  startTimeMs?: number;
  duration?: Duration;
  words?: Words[];
  alternatives?: Alternatives[];
  type?: string;
}

export type Offset = Record<string, unknown>;

export interface Words {
  word?: string;
  confidence?: number;
  offset?: Offset;
  startTimeMs?: number;
  duration?: Duration;
}

export interface Alternatives {
  text?: string;
  confidence?: number;
  offset?: Offset;
  startTimeMs?: number;
  duration?: Duration;
  words?: Words;
}

export interface Sentiment {
  participant?: string;
  phrase?: string;
  offset?: Offset;
  startTimeMs?: number;
  duration?: Duration;
  sentiment?: number;
  phraseIndex?: number;
  type?: string;
}

export interface Topics {
  participant?: string;
  topicId?: string;
  topicName?: string;
  topicPhrase?: string;
  transcriptPhrase?: string;
  confidence?: number;
  offset?: Offset;
  startTimeMs?: number;
  duration?: Duration;
  type?: string;
}

export interface Acoustic {
  eventType?: string;
  offsetMs?: number;
  startTimeMs?: number;
  durationMs?: number;
  participant?: string;
}

/**
 * This is the schema for the collection of transcripts associated with a communication.
 */
export interface TranscriptResponseFormat {
  organizationId?: string;
  conversationId?: string;
  communicationId?: string;
  mediaType?: string;
  conversationStartTime?: number;
  startTime?: number;
  duration?: Duration;
  transcripts?: Transcript[];
  participants?: Participant[];
  uri?: string;
}

export interface Transcript {
  transcriptId?: string;
  language?: string;
  programId?: string;
  engineId?: string;
  startTime?: number;
  phrases?: Phrase[];
  duration?: Duration;
  subject?: string;
  messageType?: string;
  analytics?: {
    sentiment?: Sentiment[];
    topics?: Topics[];
    acoustic?: Acoustic[];
  };
}

export interface Participant {
  participantPurpose?: string;
  userId?: string;
  teamId?: string;
  initialDirection?: string;
  messageType?: string;
  queueId?: string;
  flowId?: string;
  flowVersion?: string;
  divisionId?: string;
  ani?: string;
  dnis?: string;
  to?: string;
  from?: string;
  startTimeMs?: number;
  endTimeMs?: number;
}
