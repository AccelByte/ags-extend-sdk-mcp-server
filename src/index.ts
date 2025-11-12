// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import SessionManager from './session/manager.js';
import { BaseServer } from './server/types.js';
import StreamableHttpServer from './server/streamableHttp.js';
import StdioServer from './server/stdio.js';

import { CONFIG } from './config.js';
import registerResources from './resources/register.js';
import searchSymbolsTool from './tools/symbols/searchTool.js';
import describeSymbolsTool from './tools/symbols/describeTool.js';
import createExtendAppPrompt from './prompts/createExtendApp/prompt.js';

const sessionManager = new SessionManager();

let server: BaseServer;
if (CONFIG.transport === 'http') {
  server = new StreamableHttpServer(
    CONFIG.name,
    CONFIG.version,
    CONFIG.port,
    sessionManager
  );
} else if (CONFIG.transport === 'stdio') {
  server = new StdioServer(CONFIG.name, CONFIG.version, sessionManager);
} else {
  throw new Error(`Invalid transport: ${CONFIG.transport}`);
}

server.modify(registerResources);
server.modify(searchSymbolsTool);
server.modify(describeSymbolsTool);
server.modify(createExtendAppPrompt);

await server.start();

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
