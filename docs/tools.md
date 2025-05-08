# Tools

## Search Queues

Searches for routing queues based on their name, allowing for wildcard searches. Returns a paginated
list of matching queues, including their Name, ID, Description (if available), and Member Count
(if available). Also provides pagination details like current page, page size, total results found,
and total pages available. Useful for finding specific queue IDs, checking queue configurations,
or listing available queues.

[Source file](/src/tools/searchQueues.ts).

### Inputs

* `name`
  * The name (or partial name) of the routing queue(s) to search for. Wildcards ('*') are supported for pattern matching (e.g., 'Support*', '*Emergency', '*Sales*'). Use '*' alone to retrieve all queues.
* `pageNumber`
  * The page number of the results to retrieve, starting from 1. Defaults to 1 if not specified. Used with 'pageSize' for navigating large result sets.
* `pageSize`
  * The maximum number of queues to return per page. Defaults to 100 if not specified. Used with 'pageNumber' for pagination. The maximum value is 500.

### Security

Required permission:
* `routing:queue:view`

Platform API endpoint used:
* [`GET /api/v2/routing/queues`](https://developer.genesys.cloud/routing/routing/#get-api-v2-routing-queues)

## Query Queue Volumes

Returns a breakdown of how many conversations occurred in each specified queue between two
dates. Useful for comparing workload across queues.

[Source file](/src/tools/queryQueueVolumes.ts).

### Inputs

* `queueIds`
  * The IDs of the queues to filter conversations by. Max 300.
* `startDate`
  * The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z').
* `endDate`
  * The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z').

### Security

Required permission:
* `analytics:conversationDetail:view`

Platform API endpoints used:
* [`POST /api/v2/analytics/conversations/details/jobs`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-conversations-details-jobs)
* [`GET /api/v2/analytics/conversations/details/jobs/{jobId}`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId-)
* [`GET /api/v2/analytics/conversations/details/jobs/{jobId}/results`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId--results)

## Sample Conversations By Queue

Retrieves conversation analytics for a specific queue between two dates, returning a
representative sample of conversation IDs. Useful for reporting, investigation, or summarisation.

### Inputs

* `queueId`
  * The ID of the queue to filter conversations by.
* `startDate`
  * The start date/time in ISO-8601 format (e.g., '2024-01-01T00:00:00Z').
* `endDate`
  * The end date/time in ISO-8601 format (e.g., '2024-01-07T23:59:59Z').

### Security

Required Permissions:
* `analytics:conversationDetail:view`

Platform API endpoints used:
* [`POST /api/v2/analytics/conversations/details/jobs`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-conversations-details-jobs)
* [`GET /api/v2/analytics/conversations/details/jobs/{jobId}`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId-)
* [`GET /api/v2/analytics/conversations/details/jobs/{jobId}/results`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId--results)

## Voice Call Quality

Retrieves voice call quality metrics for one or more conversations by ID. This tool specifically focuses
on voice interactions and returns the minimum Mean Opinion Score (MOS) observed in each conversation, helping
identify degraded or poor-quality voice calls.

Read more [about MOS scores and how they're determined](https://developer.genesys.cloud/analyticsdatamanagement/analytics/detail/call-quality).

[Source file](/src/tools/voiceCallQuality.ts).

### Inputs

* `conversationIds`
  * A list of up to 100 conversation IDs to evaluate voice call quality for.

### Security

Required Permissions:
* `analytics:conversationDetail:view`

Platform API endpoint used:
* [`GET /api/v2/analytics/conversations/details`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details)
