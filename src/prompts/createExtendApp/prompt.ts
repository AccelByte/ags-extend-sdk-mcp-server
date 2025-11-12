// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

import { completable } from '@modelcontextprotocol/sdk/server/completable.js';
import { McpServer as HLMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import repositoriesData from './repositories.json' with { type: 'json' };
import { Repository, RepositoryArraySchema } from './types.js';

const repositories = RepositoryArraySchema.parse(repositoriesData);

function getPrompt(repository: Repository) {
  let repoUrl = repository.url;

  if (repository.branch) {
    repoUrl = `${repoUrl} (branch: ${repository.branch})`;
  }

  return `
Execution Principles:
- Execute steps sequentially, one at a time. Do not combine multiple steps into a single command or script.
- Verify each step completes successfully before proceeding to the next step.
- If an error occurs, display a clear error message, stop execution, and provide actionable next steps.
- Only prompt the user when necessary (e.g., before installing IDE extensions or capabilities).
- Use clear, concise user-facing messages for all prompts and reminders.

Step-by-Step Instructions:

1. Clone the repository
  - Clone the Git repository from \`${repoUrl}\` using \`git clone\`. The repository will be cloned into a directory named after the repository (e.g., cloning \`github.com/foo/bar\` creates a \`bar\` directory).
  - Verify the clone succeeded: check that the directory exists and contains expected files (e.g., README, source files, or configuration files).

2. Check for Dev Container configuration
  - Check if the repository contains Dev Container configuration files in any of these locations:
    - \`.devcontainer/devcontainer.json\` (primary location)
    - \`.devcontainer.json\` (repository root)
    - \`.devcontainer/SUBDIRECTORY/devcontainer.json\` (alternative configurations, if any)
  - Verify the configuration file exists and is readable if found.
  - If multiple configurations exist, note that users may have a choice when setting up the Dev Container.

3. Reopen workspace (with Dev Container if available)
  - IMPORTANT: All workspace reopening operations must target the cloned repository directory (created in step 1), NOT the current workspace directory.
  - If Dev Container configuration was found in step 2:
    - Check if the current IDE supports Dev Containers (has a Dev Container feature or extension).
    - If IDE supports Dev Containers:
      - Check if the Dev Container feature/capability is available and enabled in the IDE.
      - If available: attempt to reopen the cloned repository directory in a Dev Container (specify the full path to the cloned directory when reopening).
        - If the attempt succeeds: verify the container is running and the workspace is connected to the cloned directory.
        - If the attempt fails: display a clear message explaining the failure, then provide IDE-agnostic manual instructions (e.g., "Use your IDE's Dev Container feature to open the cloned repository directory in a container. Look for commands or menu options related to 'Dev Containers' or 'Reopen in Container', and make sure to select the cloned repository directory: [path to cloned repository].").
      - If not available: prompt the user to install or enable the Dev Container feature/extension for their IDE.
        - If user approves: install/enable it, then attempt to reopen the cloned repository directory in a Dev Container.
        - If user declines: inform them that Dev Container configuration is available but requires the IDE feature to use it, then reopen the workspace to the cloned repository directory normally (without container).
    - If IDE does not support Dev Containers:
      - Inform the user that the project includes Dev Container configuration, but their IDE does not support it, then reopen the workspace to the cloned repository directory normally (without container).
  - If no Dev Container configuration was found:
    - Attempt to reopen the IDE workspace to the cloned repository directory (specify the full path to the cloned directory).
    - If automatic reopening fails, provide simple manual instructions for opening the directory in the IDE (e.g., "Open the folder: [path to cloned repository]").
  - Verify the workspace is ready and points to the cloned repository directory (either in container or directly).

4. Complete setup
  - If Dev Container was set up: verify the workspace is running in the container and ready for development.
  - If no Dev Container was used: verify the workspace is in the cloned directory and ready for development.
  - Confirm the workspace is ready for the user to begin development.

Notes:
- "Workspace directory" refers to the active project directory opened in the IDE.
- CRITICAL: When reopening the workspace, always target the cloned repository directory (from step 1), never the current workspace directory. Always specify the full path to the cloned directory when reopening.
- Never assume Dev Container support exists without first verifying configuration files are present.
- When providing manual instructions, use generic IDE-agnostic language rather than IDE-specific commands or menu paths.
- If Dev Container setup fails, always provide manual recovery instructions that work across different IDEs.
`.trim();
}

function createExtendAppPrompt(server: HLMcpServer) {
  const scenarioCompletable = completable(z.string(), (value: string) =>
    Array.from(
      new Set(
        repositories
          .filter((r) =>
            r.scenario.toLowerCase().startsWith(value.toLowerCase())
          )
          .map((r) => r.scenario)
      )
    ).sort()
  );

  const templateCompletable = completable(
    z.string(),
    (value: string, context?: { arguments?: Record<string, string> }) => {
      const scenario = context?.arguments?.scenario;
      if (!scenario) {
        return [];
      }
      return Array.from(
        new Set(
          repositories
            .filter(
              (r) =>
                r.scenario === scenario &&
                r.template.toLowerCase().startsWith(value.toLowerCase())
            )
            .map((r) => r.template)
        )
      ).sort();
    }
  );

  const languageCompletable = completable(
    z.string(),
    (value: string, context?: { arguments?: Record<string, string> }) => {
      const scenario = context?.arguments?.scenario;
      const template = context?.arguments?.template;
      if (!scenario || !template) {
        return [];
      }
      return Array.from(
        new Set(
          repositories
            .filter(
              (r) =>
                r.scenario === scenario &&
                r.template === template &&
                r.language.toLowerCase().startsWith(value.toLowerCase())
            )
            .map((r) => r.language)
        )
      ).sort();
    }
  );

  const repositoryCompletable = completable(
    z.string(),
    (
      value: string,
      context?: {
        arguments?: Record<string, string>;
      }
    ) => {
      const scenario = context?.arguments?.scenario;
      const template = context?.arguments?.template;
      const language = context?.arguments?.language;
      if (!scenario || !template || !language) {
        return [];
      }
      return Array.from(
        new Set(
          repositories
            .filter(
              (r) =>
                r.scenario === scenario &&
                r.template === template &&
                r.language === language
            )
            .map((r) => r.name)
        )
      ).sort();
    }
  );

  const repositoryMap = new Map(repositories.map((r) => [r.name, r]));

  server.registerPrompt(
    'create-extend-app',
    {
      title: 'Creates a new Extend app',
      description: 'Creates a new Extend app by cloning a template repository.',
      argsSchema: {
        scenario: scenarioCompletable,
        template: templateCompletable,
        language: languageCompletable,
        repository: repositoryCompletable,
      },
    },
    ({ repository }: { repository: string }) => {
      const repo = repositoryMap.get(repository);

      if (!repo) {
        throw new Error(`Repository not found: ${repository}`);
      }

      return {
        messages: [
          {
            role: 'assistant' as const,
            content: {
              type: 'text' as const,
              text: getPrompt(repo),
            },
          },
        ],
      };
    }
  );
}

export default createExtendAppPrompt;
