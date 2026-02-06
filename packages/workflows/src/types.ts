export type WhatsAppEvent =
  | "message.received"
  | "message.sent"
  | "message.delivered"
  | "message.read"
  | "button.clicked"
  | "list.selected"
  | "conversation.started"
  | "conversation.ended";

export interface WorkflowConfig {
  kapsoApiKey: string;
  make?: {
    webhooks?: Record<string, string>;
    apiKey?: string;
  };
}

export interface EventMessage {
  id: string;
  type: string;
  text?: string;
  timestamp: Date;
}

export interface ConversationData {
  id: string;
  startedAt: Date;
}

export interface EventData {
  from: string;
  to: string;
  message?: EventMessage;
  conversation?: ConversationData;
  metadata?: Record<string, unknown>;
}

export interface WorkflowEvent {
  type: WhatsAppEvent;
  data: EventData;
}

export interface EventHandler {
  (data: EventData): Promise<void> | void;
}

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
  onRetry?: (error: unknown, attempt: number) => void;
}

export interface ConditionalChain<T = EventData> {
  then(handler: (data: T) => Promise<void> | void): ConditionalChain<T>;
  otherwise(handler: (data: T) => Promise<void> | void): ConditionalChain<T>;
  run(data: T): Promise<void>;
}
