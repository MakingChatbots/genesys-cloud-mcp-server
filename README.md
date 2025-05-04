# Genesys Cloud MCP Server

[![Follow me on LinkedIn for updates](https://img.shields.io/badge/Follow%20for%20updates-LinkedIn-blue)](https://www.linkedin.com/in/lucas-woodward-the-dev/)

A Model Context Protocol (MCP) server for Genesys Cloud's Platform API.

## Tools

Below are the tools this MPC server makes available. Alongside each tool are the Genesys Cloud endpoints
used and the permissions your OAuth Client needs to use them.

| Tool                          | Permissions                         | APIs used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Search Queues                 | `routing:queue:view`                | [`GET /api/v2/routing/queues`](https://developer.genesys.cloud/routing/routing/#get-api-v2-routing-queues)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Query Queue Volumes           | `analytics:conversationDetail:view` | [`POST /api/v2/analytics/conversations/details/jobs`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-conversations-details-jobs)<br/>[`GET /api/v2/analytics/conversations/details/jobs/{jobId}`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId-)<br/>[`GET /api/v2/analytics/conversations/details/jobs/{jobId}/results`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId--results) |
| Sample Conversations By Queue | `analytics:conversationDetail:view` | [`POST /api/v2/analytics/conversations/details/jobs`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#post-api-v2-analytics-conversations-details-jobs)<br/>[`GET /api/v2/analytics/conversations/details/jobs/{jobId}`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId-)<br/>[`GET /api/v2/analytics/conversations/details/jobs/{jobId}/results`](https://developer.genesys.cloud/analyticsdatamanagement/analytics/analytics-apis#get-api-v2-analytics-conversations-details-jobs--jobId--results) |

## Authentication

This currently only a supports stdio Server. To configure authentication you'll need to:

1. Create an OAuth Client in Genesys Cloud
2. Assign the permissions to it for the tools you want to be used
3. Provide the following environment variables when referencing the server:
   - `GENESYSCLOUD_REGION`
   - `GENESYSCLOUD_OAUTHCLIENT_ID`
   - `GENESYSCLOUD_OAUTHCLIENT_SECRET`

## Getting Started

```bash
nvm use
npm install
npm run dev
```

## Under active development

This is part of [personal project](https://www.linkedin.com/posts/lucas-woodward-the-dev_genesys-genesyscloud-vertexai-activity-7321306518908280833-cWt8?utm_source=share&utm_medium=member_desktop&rcm=ACoAABsbo2wBcmnNqxYJ5UO9BrsfURZcVEtgLOU)
to create a conversational Business Insights tool. It is a practical way for my to learn MCP servers, and how best to represent Genesys Cloud's Platform APIs in a way that can be easily consumed by LLMs.

There will be a lot of changes, and I will be sure to [share my learnings in my newsletter](https://makingchatbots.com/).
