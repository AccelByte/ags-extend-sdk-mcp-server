// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import resourcesData from './resources.json' with { type: 'json' };
import { parseResources } from './types.js';

const resources = parseResources(resourcesData);

function registerResources(server: HLMcpServer) {
  resources.forEach((resource) => {
    server.registerResource(
      resource.title,
      resource.getUri(),
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async (uri, context) => ({
        contents: await resource.getContents(uri, context),
      })
    );
  });
}

export default registerResources;
