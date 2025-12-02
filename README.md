# Genesys Cloud MCP Server

[![npm](https://img.shields.io/npm/v/@makingchatbots/genesys-cloud-mcp-server)](https://www.npmjs.com/package/@makingchatbots/genesys-cloud-mcp-server)
[![Follow me on LinkedIn for updates](https://img.shields.io/badge/Follow%20for%20updates-LinkedIn-blue)](https://www.linkedin.com/in/lucas-woodward-the-dev/)

A Model Context Protocol (MCP) server for Genesys Cloud's Platform API.

## Features

| Tool                                                                          | Description                                                              |
|-------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| [Search Queues](/docs/tools.md#search-queues)                                 | Searches for queues by their name (supports wildcards)                   |
| [Query Queue Volumes](/docs/tools.md#query-queue-volumes)                     | Retrieves conversation volumes and member count by Queue IDs             |
| [Sample Conversations By Queue](/docs/tools.md#sample-conversations-by-queue) | Retrieves a representative sample of Conversation IDs for a Queue ID     |
| [Voice Call Quality](/docs/tools.md#voice-call-quality)                       | Retrieves voice call quality metrics for one or more conversations by ID |
| [Conversation Sentiment](/docs/tools.md#conversation-sentiment)               | Retrieves the sentiment for one or more conversations by ID              |
| [Conversation Topics](/docs/tools.md#conversation-topics)                     | Retrieves the topics for a conversation by ID                            |
| [Search Voice Conversation](/docs/tools.md#search-voice-conversations)        | Searches voice conversations by optional criteria                        |
| [Conversation Transcript](/docs/tools.md#conversation-transcript)             | Retrieves conversation transcript                                        |
| [OAuth Clients](/docs/tools.md#oauth-clients)                                 | Retrieves a list of all the OAuth clients                                |
| [OAuth Client Usage](/docs/tools.md#oauth-client-usage)                       | Retrieves usage of an OAuth client                                       |

## Usage with Claude Desktop

### MCP Bundle

This MCP Server provides an [MCP Bundle](https://github.com/anthropics/mcpb) (.mcpb file) along with each [release](https://github.com/MakingChatbots/genesys-cloud-mcp-server/releases),
which is a single-click installable package for Claude Desktop. To use it:

1. Download the `.mcpb` file from the [latest release](https://github.com/MakingChatbots/genesys-cloud-mcp-server/releases)
2. In Claude Desktop navigate to Settings > Extensions.
3. Open the .mcpb file with Claude
4. Configure the Region and OAuth Client for the extension

The extension will now be available in your conversations.

### NPX

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "genesys-cloud": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@makingchatbots/genesys-cloud-mcp-server"],
      "env": {
        "GENESYSCLOUD_REGION": "<PUT REGION HERE>",
        "GENESYSCLOUD_OAUTHCLIENT_ID": "<PUT OAUTHCLIENT ID HERE>",
        "GENESYSCLOUD_OAUTHCLIENT_SECRET": "<PUT OAUTHCLIENT SECRET HERE>"
      }
    }
  }
}
```

## Usage with Gemini CLI

Add below to your `.gemini/settings.json` file. You can read more about the [setup from the official guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/tutorials.md#configure-the-mcp-server-in-settingsjson).

```json
{
  "mcpServers": {
    "genesysCloud": {
      "command": "npx",
      "args": ["-y", "@makingchatbots/genesys-cloud-mcp-server"],
      "env": {
        "GENESYSCLOUD_REGION": "${GENESYSCLOUD_REGION}",
        "GENESYSCLOUD_OAUTHCLIENT_ID": "${GENESYSCLOUD_OAUTHCLIENT_ID}",
        "GENESYSCLOUD_OAUTHCLIENT_SECRET": "${GENESYSCLOUD_OAUTHCLIENT_SECRET}"
      }
    }
  }
}
```

## Authentication

This currently only supports a stdio server. To configure authentication you'll need to:

1. Create an OAuth Client in Genesys Cloud
2. Assign the permissions to it for the tools you want to be used
3. Provide the following environment variables when referencing the server:
   - `GENESYSCLOUD_REGION`
   - `GENESYSCLOUD_OAUTHCLIENT_ID`
   - `GENESYSCLOUD_OAUTHCLIENT_SECRET`

## Development

### Getting Started

```bash
nvm use
npm install
npm run dev
```

## Under active development

This is part of [personal project](https://www.linkedin.com/posts/lucas-woodward-the-dev_genesys-genesyscloud-vertexai-activity-7321306518908280833-cWt8?utm_source=share&utm_medium=member_desktop&rcm=ACoAABsbo2wBcmnNqxYJ5UO9BrsfURZcVEtgLOU)
to create a conversational Business Insights tool. It is a practical way for me to learn MCP servers, and how best to represent Genesys Cloud's Platform APIs in a way that can be easily consumed by LLMs.

There will be a lot of changes, and I will be sure to [share my learnings in my newsletter](https://makingchatbots.com/).
