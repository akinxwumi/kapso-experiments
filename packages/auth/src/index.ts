import crypto from "crypto";
import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";
import { InMemoryOTPStore } from "./storage.js";
import {
  OTPConfig,
  OTPResponse,
  OTPSession,
  SendOptions,
  VerifyOptions,
} from "./types.js";

const DEFAULTS = {
  codeLength: 6 as const,
  expiresIn: 300,
  maxAttempts: 3,
  resendCooldown: 30,
  baseUrl: "https://api.kapso.ai/meta/whatsapp",
};

export class WhatsAppOTP {
  private config: Required<Omit<OTPConfig, "codeLength">> & { codeLength: 4 | 6 | 8 };
  private store = new InMemoryOTPStore();
  private client: WhatsAppClient;

  constructor(config: OTPConfig) {
    this.config = {
      kapsoApiKey: config.kapsoApiKey,
      phoneNumberId: config.phoneNumberId,
      codeLength: (config.codeLength ?? DEFAULTS.codeLength) as 4 | 6 | 8,
      expiresIn: config.expiresIn ?? DEFAULTS.expiresIn,
      maxAttempts: config.maxAttempts ?? DEFAULTS.maxAttempts,
      resendCooldown: config.resendCooldown ?? DEFAULTS.resendCooldown,
      baseUrl: config.baseUrl ?? DEFAULTS.baseUrl,
    };

    // Initialize the official Kapso WhatsApp client
    this.client = new WhatsAppClient({
      baseUrl: this.config.baseUrl,
      kapsoApiKey: this.config.kapsoApiKey,
    });
  }

  async send(options: SendOptions): Promise<OTPResponse> {
    this.store.cleanupExpired();
    const to = normalizeE164(options.to);
    if (!to) {
      return { success: false, error: "Invalid phone number format" };
    }

    const existing = this.store.getByPhone(to);
    const now = Date.now();
    if (existing && existing.resendAvailableAt > now) {
      const secondsLeft = Math.ceil((existing.resendAvailableAt - now) / 1000);
      return { success: false, error: `Resend available in ${secondsLeft}s` };
    }

    const expiresIn = options.expiresIn ?? this.config.expiresIn;
    const code = generateCode(this.config.codeLength);
    const session: OTPSession = {
      sessionId: crypto.randomUUID(),
      code,
      to,
      expiresAt: now + expiresIn * 1000,
      attemptsRemaining: this.config.maxAttempts,
      resendAvailableAt: now + this.config.resendCooldown * 1000,
    };

    this.store.set(to, session);

    const message = buildMessage(options, code);

    // Debug logging
    console.log("Generated OTP:", code);
    console.log("Message to send:", message);

    try {
      // Use the official Kapso SDK to send the message
      const sendResponse = await this.client.messages.sendText({
        phoneNumberId: this.config.phoneNumberId,
        to: to.replace(/^\+/, ""), // Remove leading + for Kapso API
        body: message,
      });

      // Log the response for debugging
      console.log("WhatsApp API Response:", JSON.stringify(sendResponse, null, 2));

      // Check if the response indicates success
      // The WhatsApp API should return a message ID if successful
      if (sendResponse && typeof sendResponse === 'object') {
        const responseObj = sendResponse as any;

        // Check for common error indicators in the response
        if (responseObj.error || responseObj.errors) {
          this.store.delete(to);
          const errorMsg = responseObj.error?.message || JSON.stringify(responseObj.errors);
          console.error("WhatsApp API returned an error:", errorMsg);
          return { success: false, error: `WhatsApp API error: ${errorMsg}` };
        }

        // Log message ID if present (indicates successful queuing)
        if (responseObj.messages?.[0]?.id || responseObj.message_id || responseObj.id) {
          const msgId = responseObj.messages?.[0]?.id || responseObj.message_id || responseObj.id;
          console.log("Message queued successfully. Message ID:", msgId);
        } else {
          console.warn("No message ID in response - delivery status uncertain");
        }
      }
    } catch (error) {
      // Clean up the session if sending fails
      this.store.delete(to);

      // Enhanced error logging
      console.error("Failed to send OTP via WhatsApp:");
      console.error("Error details:", error);

      if (error && typeof error === 'object') {
        console.error("Error object:", JSON.stringify(error, null, 2));
      }

      const errorMessage = error instanceof Error ? error.message : "Failed to send OTP";
      return { success: false, error: errorMessage };
    }

    return {
      success: true,
      sessionId: session.sessionId,
      expiresAt: new Date(session.expiresAt),
      attemptsRemaining: session.attemptsRemaining,
    };
  }

  async verify(options: VerifyOptions): Promise<OTPResponse> {
    this.store.cleanupExpired();
    const to = normalizeE164(options.to);
    if (!to) {
      return { success: false, error: "Invalid phone number format" };
    }

    const session = this.store.getByPhone(to);
    if (!session) {
      return { success: false, error: "No active OTP session" };
    }

    if (session.expiresAt <= Date.now()) {
      this.store.delete(to);
      return { success: false, error: "OTP expired" };
    }

    if (session.attemptsRemaining <= 0) {
      this.store.delete(to);
      return { success: false, error: "Max attempts exceeded" };
    }

    if (session.code !== options.code) {
      session.attemptsRemaining -= 1;
      this.store.set(to, session);
      return {
        success: false,
        attemptsRemaining: session.attemptsRemaining,
        error: "Invalid code",
      };
    }

    this.store.delete(to);
    return {
      success: true,
      sessionId: session.sessionId,
      expiresAt: new Date(session.expiresAt),
      attemptsRemaining: session.attemptsRemaining,
    };
  }
}

function generateCode(length: 4 | 6 | 8): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(length, "0");
}

function normalizeE164(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function buildMessage(options: SendOptions, code: string): string {
  const template = options.template ?? "{brand} verification code: {code}";
  return template
    .replace("{brand}", options.brand)
    .replace("{code}", code);
}

export type { OTPConfig, OTPResponse, SendOptions, VerifyOptions } from "./types.js";

