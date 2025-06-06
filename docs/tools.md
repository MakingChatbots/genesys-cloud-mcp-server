# Tools

## Search Queues

**Tool name:** `search_queues`

Searches for routing queues based on their name, allowing for wildcard searches. Returns a paginated
list of matching queues, including their Name, ID, Description (if available), and Member Count
(if available). Also provides pagination details like current page, page size, total results found,
and total pages available. Useful for finding specific queue IDs, checking queue configurations,
or listing available queues.

[Source file](/src/tools/searchQueues.ts).

### Inputs

- `name`
  - The name (or partial name) of the routing queue(s) to search for. Wildcards ('\*') are supported for pattern matching (e.g., 'Support\*', '\*Emergency', '\*Sales\*'). Use '\*' alone to retrieve all queues
- `pageNumber`
  - The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets
- `pageSize`
  - The maximum number of queues to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 500

### Security

Required permission:

- `routing:queue:view`

Platform API endpoint used:

- [`GET /api/v2/routing/queues`](https://developer.genesys.cloud/routing/routing/#get-api-v2-routing-queues)

## Query Queue Volumes

**Tool name:** `query_queue_volumes`

Returns a breakdown of how many conversations occurred in each specified queue between two dates. Useful for comparing workload across queues.

[Source file](/src/tools/queryQueueVolumes/queryQueueVolumes.ts).

### Inputs

- `queueIds`
  - List of up to 300 queue IDs to filter conversations by
- `startDate`
  - The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')
- `endDate`
  - The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')

### Security

Required permission:

- `analytics:conversationDetail:view`

Platform API endpoints used:

- [`POST /api/v2/analytics/conversations/details/jobs`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-conversations-details-jobs)
- [`GET /api/v2/analytics/conversations/details/jobs/{jobId}`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId-)
- [`GET /api/v2/analytics/conversations/details/jobs/{jobId}/results`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId--results)

## Sample Conversations By Queue

**Tool name:** `sample_conversations_by_queue`

Retrieves conversation analytics for a specific queue between two dates, returning a representative sample of conversation IDs. Useful for reporting, investigation, or summarisation.

### Inputs

- `queueId`
  - The UUID of the queue to filter conversations by. (e.g., 00000000-0000-0000-0000-000000000000)
- `startDate`
  - The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')
- `endDate`
  - The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')

### Security

Required Permission:

- `analytics:conversationDetail:view`

Platform API endpoints used:

- [`POST /api/v2/analytics/conversations/details/jobs`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-conversations-details-jobs)
- [`GET /api/v2/analytics/conversations/details/jobs/{jobId}`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId-)
- [`GET /api/v2/analytics/conversations/details/jobs/{jobId}/results`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId--results)

## Voice Call Quality

**Tool name:** `voice_call_quality`

Retrieves voice call quality metrics for one or more conversations by ID. This tool specifically focuses on voice interactions and returns the minimum Mean Opinion Score (MOS) observed in each conversation, helping identify degraded or poor-quality voice calls.

Read more [about MOS scores and how they're determined](https://developer.genesys.cloud/analyticsdatamanagement/analytics/detail/call-quality).

[Source file](/src/tools/voiceCallQuality.ts).

### Inputs

- `conversationIds`
  - A list of up to 100 conversation IDs to evaluate voice call quality for

### Security

Required Permission:

- `analytics:conversationDetail:view`

Platform API endpoint used:

- [`GET /api/v2/analytics/conversations/details`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details)

## Conversation Sentiment

**Tool name:** `conversation_sentiment`

Retrieves sentiment analysis scores for one or more conversations. Sentiment is evaluated based on customer phrases, categorized as positive, neutral, or negative. The result includes both a numeric sentiment score (-100 to 100) and an interpreted sentiment label.

[Source file](/src/tools/conversationSentiment/conversationSentiment.ts).

### Inputs

- `conversationIds`
  - A list of up to 100 conversation IDs to retrieve sentiment for

### Security

Required Permissions:

- `speechAndTextAnalytics:data:view`
- `recording:recording:view`

Platform API endpoint used:

- [GET /api/v2/speechandtextanalytics/conversations/{conversationId}](https://developer.genesys.cloud/analyticsdatamanagement/speechtextanalytics/#get-api-v2-speechandtextanalytics-conversations--conversationId-)

## Conversation Topics

**Tool name:** `conversation_topics`

Retrieves Speech and Text Analytics topics detected for a specific conversation. Topics represent business-level intents (e.g. cancellation, billing enquiry) inferred from recognised phrases in the customer-agent interaction.

Read more [about programs, topics, and phrases](https://help.mypurecloud.com/articles/about-programs-topics-and-phrases/).

[Source file](/src/tools/conversationTopics/conversationTopics.ts).

### Input

- `conversationId`
  - A UUID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)

### Security

Required Permissions:

- `speechAndTextAnalytics:topic:view`
- `analytics:conversationDetail:view`
- `analytics:speechAndTextAnalyticsAggregates:view`

Platform API endpoints used:

- [GET /api/v2/speechandtextanalytics/topics](https://developer.genesys.cloud/analyticsdatamanagement/speechtextanalytics/#get-api-v2-speechandtextanalytics-topics)
- [GET /api/v2/analytics/conversations/{conversationId}/details](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations--conversationId--details)
- [POST /api/v2/analytics/transcripts/aggregates/query](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-transcripts-aggregates-query)

## Search Voice Conversations

**Tool name:** `search_voice_conversations`

Searches for voice conversations within a specified time window, optionally filtering by phone number. Returns a paginated list of conversation metadata for use in further analysis or tool calls.

[Source file](/src/tools/searchVoiceConversations.ts).

### Input

- `phoneNumber`
  - Optional. Filters results to only include conversations involving this phone number (e.g., '+440000000000')
- `pageNumber`
  - The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets
- `pageSize`
  - The maximum number of conversations to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 100
- `startDate`
  - The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z')
- `endDate`
  - The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z')

### Security

Required Permissions:

- `analytics:conversationDetail:view`

Platform API endpoints used:

- [POST /api/v2/analytics/conversations/details/query](https://developer.genesys.cloud/devapps/api-explorer-standalone#post-api-v2-analytics-conversations-details-query)

## Conversation Transcript

**Tool name:** `conversation_transcript`

Retrieves a structured transcript of the conversation, including speaker labels, utterance timestamps, and sentiment annotations where available. The transcript is formatted as a time-aligned list of utterances attributed to each participant (e.g., customer or agent)

[Source file](/src/tools/conversationTranscription/conversationTranscription.ts).

### Input

- `conversationId`
  - The UUID of the conversation to retrieve the transcript for (e.g., 00000000-0000-0000-0000-000000000000)

### Security

Required Permissions:

- `recording:recording:view`
- `speechAndTextAnalytics:data:view`

Platform API endpoints used:

- [GET /api/v2/conversations/{conversationId}/recordings](https://developer.genesys.cloud/devapps/api-explorer-standalone#get-api-v2-conversations--conversationId--recordings)
- [GET /api/v2/speechandtextanalytics/conversations/{conversationId}/communications/{communicationId}/transcripturl](https://developer.genesys.cloud/devapps/api-explorer-standalone#get-api-v2-speechandtextanalytics-conversations--conversationId--communications--communicationId--transcripturl)
