import { Message } from "./types.js";

interface Session {
  messages: Message[];
  lastUpdated: number;
}

export class InMemoryContextStore {
  private sessions = new Map<string, Session>();

  get(userId: string): Message[] {
    return this.sessions.get(userId)?.messages ?? [];
  }

  getLastUpdated(userId: string): number | undefined {
    return this.sessions.get(userId)?.lastUpdated;
  }

  set(userId: string, messages: Message[]): void {
    this.sessions.set(userId, {
      messages,
      lastUpdated: Date.now(),
    });
  }

  clear(userId: string): void {
    this.sessions.delete(userId);
  }

  add(userId: string, message: Message, windowSize: number): void {
    const session = this.sessions.get(userId);
    const existing = session?.messages ?? [];
    const next = [...existing, message];
    const trimmed = next.slice(Math.max(0, next.length - windowSize));

    this.sessions.set(userId, {
      messages: trimmed,
      lastUpdated: Date.now(),
    });
  }
}
