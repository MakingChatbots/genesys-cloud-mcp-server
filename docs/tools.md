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
  - The name (or partial name) of the routing queue(s) to search for. Wildcards ('_') are supported for pattern matching (e.g., 'Support_', '*Emergency', '*Sales*'). Use '*' alone to retrieve all queues
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

[Source file](/src/tools/queryQueueVolumes.ts).

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
  - The UUID ID of the queue to filter conversations by. (e.g., 00000000-0000-0000-0000-000000000000)
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

[Source file](/src/tools/conversationSentiment.ts).

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

[Source file](/src/tools/conversationTopics.ts).

### Input

- `conversationId`
  - A UUID ID for a conversation. (e.g., 00000000-0000-0000-0000-000000000000)

### Security

Required Permissions:

- `speechAndTextAnalytics:topic:view`
- `analytics:conversationDetail:view`
- `analytics:speechAndTextAnalyticsAggregates:view`

Platform API endpoints used:

- [GET /api/v2/speechandtextanalytics/topics](https://developer.genesys.cloud/analyticsdatamanagement/speechtextanalytics/#get-api-v2-speechandtextanalytics-topics)
- [GET /api/v2/analytics/conversations/{conversationId}/details](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations--conversationId--details)
- [POST /api/v2/analytics/transcripts/aggregates/query](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-transcripts-aggregates-query)
