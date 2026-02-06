import { OTPSession } from "./types.js";

export class InMemoryOTPStore {
  private sessions = new Map<string, OTPSession>();

  getByPhone(to: string): OTPSession | undefined {
    return this.sessions.get(to);
  }

  set(to: string, session: OTPSession): void {
    this.sessions.set(to, session);
  }

  delete(to: string): void {
    this.sessions.delete(to);
  }

  cleanupExpired(now = Date.now()): void {
    for (const [to, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(to);
      }
    }
  }
}
