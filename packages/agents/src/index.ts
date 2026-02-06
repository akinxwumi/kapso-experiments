import dns from "dns";
import { createHmac, timingSafeEqual } from "node:crypto";
import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";
import { normalizeWebhook } from "@kapso/whatsapp-cloud-api/server";
import { InMemoryContextStore } from "./store.js";
import type {
  AgentConfig,
  AgentResponse,
  ChatOptions,
  Message,
  SendMessageOptions,
  WebhookSignatureOptions,
} from "./types.js";

const DEFAULTS = {
  baseUrl: "https://api.kapso.ai/meta/whatsapp",
  contextWindow: 10,
  model: "openai/gpt-oss-120b",
  groqBaseUrl: "https://api.groq.com/openai/v1",
  sessionTimeoutMs: 300000, // 5 minutes
};

type AgentConfigResolved = Omit<AgentConfig, "groq"> & {
  groq: {
    apiKey: string;
    model: string;
  };
  baseUrl: string;
  contextWindow: number;
  systemPrompt: string;
  groqBaseUrl: string;
  sessionTimeoutMs: number;
};

export class WhatsAppAgent {
  private config: AgentConfigResolved;
  private client: WhatsAppClient;
  private store = new InMemoryContextStore();

  constructor(config: AgentConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl ?? DEFAULTS.baseUrl,
      contextWindow: config.contextWindow ?? DEFAULTS.contextWindow,
      systemPrompt: config.systemPrompt ?? "",
      groqBaseUrl: config.groqBaseUrl ?? DEFAULTS.groqBaseUrl,
      sessionTimeoutMs: config.sessionTimeoutMs ?? DEFAULTS.sessionTimeoutMs,
      groq: {
        apiKey: config.groq.apiKey,
        model: config.groq.model ?? DEFAULTS.model,
      },
    };

    dns.setDefaultResultOrder("ipv4first");

    this.client = new WhatsAppClient({
      baseUrl: this.config.baseUrl,
      kapsoApiKey: this.config.kapsoApiKey,
    });
  }

  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
  }

  async chat(options: ChatOptions): Promise<AgentResponse> {
    const userId = normalizeUserId(options.from);
    if (!userId) {
      throw new Error("Invalid sender identifier");
    }

    const trimmed = options.message.trim();
    if (!trimmed) {
      throw new Error("Message is required");
    }

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const lastUpdated = this.store.getLastUpdated(userId);
    if (lastUpdated && this.config.sessionTimeoutMs) {
      if (Date.now() - lastUpdated > this.config.sessionTimeoutMs) {
        this.store.clear(userId);
      }
    }

    this.store.add(userId, userMessage, this.config.contextWindow);

    const contextMessages = this.store.get(userId);
    const messages = buildMessages(this.config.systemPrompt, contextMessages);

    let response: Response;
    response = await fetch(`${this.config.groqBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.groq.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? this.config.groq.model,
        messages,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;

    const assistantMessage = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!assistantMessage) {
      throw new Error("OpenRouter did not return a message");
    }

    this.store.add(
      userId,
      {
        role: "assistant",
        content: assistantMessage,
        timestamp: new Date(),
      },
      this.config.contextWindow
    );

    const resolvedModel =
      data.model ?? options.model ?? this.config.groq.model ?? DEFAULTS.model;

    return {
      message: assistantMessage,
      model: resolvedModel,
      tokensUsed: data.usage?.total_tokens ?? 0,
      cost: 0,
      conversationId: data.id,
    };
  }

  async handleWebhook(payload: unknown): Promise<void> {
    const normalized = normalizeWebhook(payload);
    const incoming = extractInboundMessages(payload, normalized);

    for (const message of incoming) {
      const userId = normalizeUserId(message.from);
      if (!userId) {
        continue;
      }

      const response = await this.chat({
        from: message.from,
        message: message.body,
      });

      await this.sendMessage({
        to: message.from,
        message: response.message,
      });
    }
  }

  async sendMessage(options: SendMessageOptions): Promise<unknown> {
    const to = normalizeRecipient(options.to);
    if (!to) {
      throw new Error("Invalid phone number format");
    }

    return this.client.messages.sendText({
      phoneNumberId: this.config.phoneNumberId,
      to: to.replace(/^\+/, ""),
      body: options.message,
    });
  }

  getContext(userId: string): Promise<Message[]> {
    return Promise.resolve(this.store.get(userId));
  }

  clearContext(userId: string): Promise<void> {
    this.store.clear(userId);
    return Promise.resolve();
  }

  addContext(userId: string, message: Message): Promise<void> {
    this.store.add(userId, message, this.config.contextWindow);
    return Promise.resolve();
  }

}

function normalizeUserId(input: string): string | null {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.startsWith("+")
    ? `+${trimmed.slice(1).replace(/[^0-9]/g, "")}`
    : trimmed.replace(/[^0-9]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }
  return digits;
}

function normalizeRecipient(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    return normalizeE164(trimmed);
  }
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }
  return digits;
}

function buildMessages(systemPrompt: string, context: Message[]): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt.trim().length > 0) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  for (const message of context) {
    messages.push({ role: message.role, content: message.content });
  }
  return messages;
}

type InboundMessage = {
  from: string;
  body: string;
};

function extractInboundMessages(
  payload: unknown,
  normalized: ReturnType<typeof normalizeWebhook>
): InboundMessage[] {
  const inbound: InboundMessage[] = [];

  for (const message of normalized.messages) {
    if (message?.kapso?.direction === "outbound" || message?.kapso?.source === "smb_message_echo") {
      continue;
    }
    if (
      message.type !== "text" ||
      !message.text?.body ||
      !message.from
    ) {
      continue;
    }
    inbound.push({ from: message.from, body: message.text.body });
  }

  if (inbound.length > 0) {
    return inbound;
  }

  if (!payload || typeof payload !== "object") {
    return inbound;
  }

  const record = payload as {
    message?: {
      from?: string;
      type?: string;
      text?: { body?: string };
      kapso?: { direction?: string; content?: string };
    };
  };

  const message = record.message;
  if (!message) return inbound;
  if (message.kapso?.direction === "outbound") return inbound;

  const from = typeof message.from === "string" ? message.from : "";
  const body =
    typeof message.text?.body === "string"
      ? message.text.body
      : typeof message.kapso?.content === "string"
        ? message.kapso.content
        : "";

  if (from && body && message.type === "text") {
    inbound.push({ from, body });
  }

  return inbound;
}

interface GroqResponse {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    total_tokens?: number;
  };
}


export type {
  AgentConfig,
  AgentResponse,
  ChatOptions,
  Message,
  SendMessageOptions,
  WebhookSignatureOptions,
} from "./types.js";

export function verifySignature(
  options: WebhookSignatureOptions | { appSecret: string; rawBody: string | Buffer; signatureHeader?: string }
): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts = options as any;
    const signature = opts.signature || opts.signatureHeader;

    if (!signature) return false;

    // Handle "sha256=" prefix if present
    const hash = signature.startsWith("sha256=")
      ? signature.slice(7)
      : signature;

    const body =
      typeof options.rawBody === "string"
        ? Buffer.from(options.rawBody)
        : options.rawBody;

    const expected = createHmac("sha256", options.appSecret)
      .update(body)
      .digest("hex");

    const receivedBuffer = Buffer.from(hash, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");

    if (receivedBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
