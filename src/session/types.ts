// Copyright (c) 2025 AccelByte Inc.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod/v3';

const DEFAULT_STATUS = 'pending';

const SessionIdSchema = z.string().min(1, 'Session ID cannot be empty');

type SessionId = z.infer<typeof SessionIdSchema>;

const SessionStatusSchema = z.enum(['active', 'expired', 'revoked', 'pending']);

type SessionStatus = z.infer<typeof SessionStatusSchema>;

const SessionSchema = z.object({
  id: SessionIdSchema,
  status: SessionStatusSchema.optional()
    .default(DEFAULT_STATUS)
    .transform((s) => s.toLowerCase() as SessionStatus),
  createdAt: z
    .date()
    .optional()
    .default(() => new Date()),
  lastAccessedAt: z
    .date()
    .optional()
    .default(() => new Date()),
});

type Session = z.infer<typeof SessionSchema>;

const SessionMapSchema = z.map(SessionIdSchema, SessionSchema);

type SessionMap = z.infer<typeof SessionMapSchema>;

export {
  SessionId,
  SessionIdSchema,
  SessionStatus,
  SessionStatusSchema,
  Session,
  SessionSchema,
  SessionMap,
  SessionMapSchema,
};
