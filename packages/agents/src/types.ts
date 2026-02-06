export interface WebhookSignatureOptions {
  appSecret: string;
  rawBody: Buffer | string;
  signature: string;
}

export interface GroqConfig {
  apiKey: string;
  model?: string;
}

export interface AgentConfig {
  kapsoApiKey: string;
  phoneNumberId: string;
  groq: GroqConfig;
  groqBaseUrl?: string;
  systemPrompt?: string;
  contextWindow?: number;
  sessionTimeoutMs?: number;
  baseUrl?: string;
}

export interface ChatOptions {
  from: string;
  message: string;
  model?: string;
  maxTokens?: number;
}

export interface SendMessageOptions {
  to: string;
  message: string;
}

export interface AgentResponse {
  message: string;
  model: string;
  tokensUsed: number;
  cost: number;
  conversationId?: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}
