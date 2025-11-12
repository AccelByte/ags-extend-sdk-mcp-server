// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { randomUUID } from 'node:crypto';

import { SessionId, Session, SessionSchema, SessionMap } from './types.js';

class SessionManager {
  private readonly defaultSessionId: SessionId;

  private sessions: SessionMap = new Map();

  constructor() {
    this.defaultSessionId = randomUUID();
    this.sessions = new Map();
    this.createSession(this.defaultSessionId);
  }

  public createSession(sessionId: SessionId): Session {
    const session = SessionSchema.parse({ id: sessionId, status: 'active' });
    this.sessions.set(sessionId, session);
    return session;
  }

  public deleteSession(sessionId: SessionId): void {
    this.sessions.delete(sessionId);
  }

  public getDefaultSession(): Session {
    return this.getSession(this.defaultSessionId)!;
  }

  public getSession(sessionId: SessionId): Session | undefined {
    return this.sessions.get(sessionId);
  }

  public clear(): void {
    this.sessions.clear();
  }
}

export default SessionManager;
