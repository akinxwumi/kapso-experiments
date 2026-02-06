import type {
  ConditionalChain,
  EventData,
  EventHandler,
  WorkflowConfig,
  WorkflowEvent,
  RetryOptions,
  WhatsAppEvent,
} from "./types.js";

class WorkflowEmitter {
  private handlers = new Map<WhatsAppEvent, Set<EventHandler>>();

  on(event: WhatsAppEvent, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: WhatsAppEvent, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  async emit(event: WorkflowEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      await handler(event.data);
    }
  }
}

class WorkflowCondition<T> implements ConditionalChain<T> {
  private onTrue?: (data: T) => Promise<void> | void;
  private onFalse?: (data: T) => Promise<void> | void;

  constructor(private predicate: (data: T) => boolean | Promise<boolean>) { }

  then(handler: (data: T) => Promise<void> | void): ConditionalChain<T> {
    this.onTrue = handler;
    return this;
  }

  otherwise(handler: (data: T) => Promise<void> | void): ConditionalChain<T> {
    this.onFalse = handler;
    return this;
  }

  async run(data: T): Promise<void> {
    const result = await this.predicate(data);
    if (result) {
      await this.onTrue?.(data);
    } else {
      await this.onFalse?.(data);
    }
  }
}

const VALID_EVENTS: WhatsAppEvent[] = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "button.clicked",
  "list.selected",
  "conversation.started",
  "conversation.ended",
];

const DEFAULT_RETRY = {
  retries: 3,
  delayMs: 500,
  backoffFactor: 2,
  maxDelayMs: 5000,
};

export class WhatsAppWorkflows {
  private config: WorkflowConfig;
  private events = new WorkflowEmitter();

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  on(event: WhatsAppEvent, handler: EventHandler): void {
    this.events.on(event, handler);
  }

  off(event: WhatsAppEvent, handler: EventHandler): void {
    this.events.off(event, handler);
  }

  async handleWebhook(payload: unknown): Promise<void> {
    const event = normalizeKapsoEvent(payload);
    if (!event) {
      return;
    }

    await this.events.emit(event);
  }

  async triggerMake(webhookUrl: string, data: unknown): Promise<void> {
    const url = webhookUrl.trim();
    if (!url) {
      throw new Error("Make webhook URL is required");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data ?? {}),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Make webhook failed: ${response.status} ${text}`);
    }
  }

  async triggerMakeById(makeId: string, data: unknown): Promise<void> {
    const mappedWebhook = this.config.make?.webhooks?.[makeId];
    if (mappedWebhook) {
      await this.triggerMake(mappedWebhook, data);
      return;
    }

    throw new Error(
      "Make webhook mapping not found. Provide a webhook URL or map the makeId in make.webhooks."
    );
  }

  condition<T = EventData>(predicate: (data: T) => boolean | Promise<boolean>): ConditionalChain<T> {
    return new WorkflowCondition<T>(predicate);
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, ms));
    });
  }

  async retry<T>(fn: () => Promise<T> | T, options: RetryOptions = {}): Promise<T> {
    const retries = options.retries ?? DEFAULT_RETRY.retries;
    const backoffFactor = options.backoffFactor ?? DEFAULT_RETRY.backoffFactor;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_RETRY.maxDelayMs;
    let delayMs = options.delayMs ?? DEFAULT_RETRY.delayMs;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === retries) {
          throw error;
        }
        attempt += 1;
        options.onRetry?.(error, attempt);
        await this.delay(delayMs);
        delayMs = Math.min(maxDelayMs, Math.ceil(delayMs * backoffFactor));
      }
    }

    throw lastError;
  }
}

function normalizeKapsoEvent(payload: unknown): WorkflowEvent | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const type = record.type;
  const message = normalizeMessage(record.message);
  const conversation = normalizeConversation(record.conversation);
  const metadata = normalizeMetadata(record.metadata);

  if (typeof type === "string" && isWhatsAppEvent(type)) {
    const from = typeof record.from === "string" ? record.from : "";
    const to = typeof record.to === "string" ? record.to : "";
    if (!from || !to) {
      return null;
    }
    return {
      type,
      data: {
        from,
        to,
        message,
        conversation,
        metadata,
      },
    };
  }

  const kapsoMessage = record.message as Record<string, unknown> | undefined;
  if (!kapsoMessage) {
    return null;
  }

  const from = typeof kapsoMessage.from === "string" ? kapsoMessage.from : "";
  const conversationRecord = record.conversation as Record<string, unknown> | undefined;
  const to =
    typeof record.phone_number_id === "string"
      ? record.phone_number_id
      : typeof conversationRecord?.phone_number_id === "string"
        ? (conversationRecord.phone_number_id as string)
        : "";

  if (!from || !to) {
    return null;
  }

  const eventType = resolveKapsoEventType(kapsoMessage);

  return {
    type: eventType,
    data: {
      from,
      to,
      message,
      conversation,
      metadata,
    },
  };
}

function isWhatsAppEvent(event: string): event is WhatsAppEvent {
  return VALID_EVENTS.includes(event as WhatsAppEvent);
}

function normalizeMessage(value: unknown): EventData["message"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const type = typeof record.type === "string" ? record.type : "";
  const timestamp = parseTimestamp(record.timestamp ?? record.time ?? record.createdAt);

  if (!id || !type || !timestamp) {
    return undefined;
  }

  let text: string | undefined;
  if (typeof record.text === "string") {
    text = record.text;
  } else if (record.text && typeof record.text === "object") {
    const body = (record.text as { body?: unknown }).body;
    if (typeof body === "string") {
      text = body;
    }
  }

  if (!text && record.kapso && typeof record.kapso === "object") {
    const content = (record.kapso as { content?: unknown }).content;
    if (typeof content === "string") {
      text = content;
    }
  }
  return {
    id,
    type,
    text,
    timestamp,
  };
}

function normalizeConversation(value: unknown): EventData["conversation"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const startedAt = parseTimestamp(record.startedAt ?? record.started_at ?? record.timestamp);

  if (!id || !startedAt) {
    return undefined;
  }

  return {
    id,
    startedAt,
  };
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function parseTimestamp(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return new Date(numeric < 1e12 ? numeric * 1000 : numeric);
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }

  return undefined;
}

function resolveKapsoEventType(message: Record<string, unknown>): WhatsAppEvent {
  const kapso = message.kapso as Record<string, unknown> | undefined;
  const direction = typeof kapso?.direction === "string" ? kapso.direction : "";
  const status = typeof kapso?.status === "string" ? kapso.status : "";

  if (direction === "outbound") {
    if (status === "read") {
      return "message.read";
    }
    if (status === "delivered") {
      return "message.delivered";
    }
    if (status === "sent") {
      return "message.sent";
    }
  }

  return "message.received";
}

export type {
  ConditionalChain,
  EventData,
  EventHandler,
  RetryOptions,
  WhatsAppEvent,
  WorkflowConfig,
  WorkflowEvent,
} from "./types.js";
