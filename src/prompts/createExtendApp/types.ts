// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { z } from 'zod/v3';

const ScenarioSchema = z.enum([
  'Extend Override',
  'Extend Service Extension',
  'Extend Event Handler',
]);

type Scenario = z.infer<typeof ScenarioSchema>;

const KnownLanguageSchema = z.enum(['C#', 'Go', 'Java', 'Python']);
const UnknownLanguageSchema = z.string().min(1, 'Language cannot be empty');
const LanguageSchema = KnownLanguageSchema.or(UnknownLanguageSchema);

type Language = z.infer<typeof LanguageSchema>;

const RepositorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  url: z.string().url(),
  branch: z.string().optional(),
  scenario: ScenarioSchema,
  template: z.string().min(1, 'Template cannot be empty'),
  language: LanguageSchema,
});

type Repository = z.infer<typeof RepositorySchema>;

const RepositoryArraySchema = z.array(RepositorySchema);

type RepositoryArray = z.infer<typeof RepositoryArraySchema>;

export {
  Scenario,
  ScenarioSchema,
  Language,
  LanguageSchema,
  Repository,
  RepositorySchema,
  RepositoryArray,
  RepositoryArraySchema,
};
