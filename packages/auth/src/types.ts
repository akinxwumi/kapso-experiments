export type CodeLength = 4 | 6 | 8;

export interface OTPConfig {
  kapsoApiKey: string;
  phoneNumberId: string; // WhatsApp Business Phone Number ID
  codeLength?: CodeLength;
  expiresIn?: number; // seconds
  maxAttempts?: number;
  resendCooldown?: number; // seconds
  baseUrl?: string;
}

export interface SendOptions {
  to: string; // E.164 format
  brand: string;
  template?: string; // e.g., "{brand} verification code: {code}"
  language?: string;
  expiresIn?: number; // seconds override
}

export interface VerifyOptions {
  to: string;
  code: string;
}

export interface OTPResponse {
  success: boolean;
  sessionId?: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
  error?: string;
}

export interface OTPSession {
  sessionId: string;
  code: string;
  to: string;
  expiresAt: number;
  attemptsRemaining: number;
  resendAvailableAt: number;
}
