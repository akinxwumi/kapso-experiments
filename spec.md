# Kapso Experiments: Combined Specs

## Auth Primitive — `@kapso/auth`

Problem
- Developers rely on paid OTP providers (Twilio Verify at ~$0.05/verification) even though WhatsApp is already an authenticated session.

Core insight
- Phone numbers are identity. OTP should live inside the WhatsApp conversation and cost $0.

Core features
- OTP generation and delivery
- Secure code generation (4-8 digits, configurable)
- Built-in expiration handling (configurable)
- Automatic rate limiting per phone number
- Interactive verification (future)
- WhatsApp-native buttons for verify and resend
- State management
- Internal session storage (in-memory for PoC)
- Automatic cleanup of expired codes
- Attempt tracking (max tries, configurable)

Technical architecture
- In-memory Map/cache for session storage
- Auto-cleanup via TTL
- Future pluggable storage adapters

API design
```ts
interface OTPConfig {
  kapsoApiKey: string;
  codeLength?: 4 | 6 | 8; // default: 6
  expiresIn?: number; // seconds
  maxAttempts?: number; // default: 3
  storage?: StorageAdapter; // future
  webhookUrl?: string; // future
}

interface SendOptions {
  to: string; // E.164 format
  brand: string; // Company/app name
  template?: string; // Custom message template
  language?: string; // default: 'en'
}

interface VerifyOptions {
  to: string;
  code: string;
}

interface OTPResponse {
  success: boolean;
  sessionId?: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
  error?: string;
}
```

Example usage (from spec)
```ts
// Initialize
const otp = new WhatsAppOTP({ kapsoApiKey: 'xxx', template: 'Your OTP is {code}' });
```

PoC scope
- OTP generation with secure randomness
- Session management with expiration
- Basic send/verify methods
- In-memory storage

Possible future features
- Interactive button components
- Button click webhook handling
- Resend logic with rate limiting
- Pluggable storage adapters
- Templates, languages, and analytics

## Payments Primitive — `@kapso/payments`

Problem
- Commerce breaks the conversation flow when users are redirected to external payment links, causing 30-40% drop-off.

Core insight
- Payments should complete inside the conversation context, with status and confirmation in the thread.

Core features
- Multi-provider support
- Stripe as the initial provider
- Future providers (PayPal, Coinbase, Razorpay, M-Pesa)
- In-conversation payment UX
- Interactive message with payment options
- In-thread status updates and confirmation
- Smart routing (future)
- Route by location, currency, amount, and history

Payment flow
```
1. Merchant calls payments.request()
2. SDK generates interactive WhatsApp message
3. Customer selects payment method
4. SDK creates provider-specific payment intent
5. Customer clicks secure link → payment page
6. Payment completes → webhook to merchant
7. Confirmation sent in WhatsApp thread
```

API design
```ts
interface PaymentConfig {
  kapsoApiKey: string;
  providers: {
    stripe?: {
      secretKey: string;
      webhookSecret?: string;
    };
    // paypal?: { ... };
    // coinbase?: { ... };
  };
  webhookUrl?: string; // Merchant webhook for payment events
}

interface PaymentRequest {
  to: string;
  amount: number;
  currency: string; // ISO 4217
  description: string;
  metadata?: Record<string, any>;
  methods?: PaymentMethod[];
  successUrl?: string;
  cancelUrl?: string;
}

type PaymentMethod = 'card' | 'apple-pay' | 'google-pay' | 'usdc' | 'btc' | 'eth';

interface PaymentResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  method?: PaymentMethod;
  providerTransactionId?: string;
  completedAt?: Date;
}

interface PaymentEvent {
  type: 'payment.initiated' | 'payment.completed' | 'payment.failed';
  paymentId: string;
  customerId: string; // Phone number
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}
```

PoC scope
- Stripe integration for payment links
- Webhook-confirmed success messages in WhatsApp
- Minimal configuration with success/cancel URLs

Possible future features
- Additional providers
- Stablecoin/crypto primitives
- Smart routing and localized payment methods
- Rich in-thread UX (buttons, receipts, reactions)

## Workflows Primitive — `@kapso/workflows`

Problem
- Connecting WhatsApp to tools like CRM, Sheets, and Slack requires custom glue code per integration.

Core insight
- Kapso can be the orchestration layer that translates WhatsApp events into workflows across the stack.

Core features
- Event-driven workflow engine for Kapso webhooks
- Make.com webhook triggers (PoC for 1,000+ apps)
- Helper utilities for conditionals, delays, and retries

Event flow (PoC)
```
WhatsApp Event → Kapso Webhook → Workflow Engine → Make.com Webhook → Scenario → Action(s)
```

API design
```ts
interface WorkflowConfig {
  kapsoApiKey: string;
  make: {
    webhooks?: {
      [eventName: string]: string; // Make.com webhook URLs
    };
    apiKey?: string;
  };
}

interface WorkflowEngine {
  on(event: WhatsAppEvent, handler: EventHandler): void;
  off(event: WhatsAppEvent, handler: EventHandler): void;
  triggerMake(webhookUrl: string, data: any): Promise<void>;
  triggerMakeById(makeId: string, data: any): Promise<void>;
  condition(predicate: (data: any) => boolean): ConditionalChain;
  delay(ms: number): Promise<void>;
  retry(fn: Function, options?: RetryOptions): Promise<any>;
}

type WhatsAppEvent =
  | 'message.received'
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'button.clicked'
  | 'list.selected'
  | 'conversation.started'
  | 'conversation.ended';
```

PoC scope
- Event-driven engine for Kapso webhooks
- Make.com webhook triggers for 1,000+ apps
- Minimal helper utilities (condition, retry, delay)

Possible future features
- Direct integrations for top apps
- Lower latency, lower cost, better error handling
- Bidirectional sync and richer data mapping

## Agents Primitive — `@kapso/agents`

Problem
- Building conversational AI on WhatsApp requires LLM orchestration, context management, and tool execution on top of messaging.

Core insight
- WhatsApp is the ideal interface for async, personal AI. Assuming Kapso already solves messaging, the next layer is AI orchestration.

Core features
- Conversational context management (in-memory for PoC)
- Multi-model support (PoC via Groq, future via OpenRouter and direct providers)
- Function calling (future)
- Agent behaviors (future: system prompts, streaming, typing indicators)

Agent flow
```
User Message → Kapso Webhook → App Webhook Handler → Agent Engine → Groq → LLM Response → Agent Engine → WhatsApp Message
                                      ↓
                                Context Store (in-memory)
                                      ↓
                                Function Calls (future)
```

API design
```ts
interface AgentConfig {
  kapsoApiKey: string;
  openRouter: {
    apiKey: string;
    model?: string; // e.g., 'anthropic/claude-3-sonnet'
  };
  systemPrompt?: string;
  // contextWindow?: number; // Default: 10 messages
  // functions?: AgentFunction[];
  // storage?: StorageAdapter;
}

interface AgentFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
  handler: (args: any) => Promise<any>;
}

interface AgentEngine {
  chat(options: {
    from: string;
    message: string;
    model?: string;
    maxTokens?: number;
  }): Promise<AgentResponse>;

  handleWebhook(payload: unknown): Promise<void>;
  getContext(userId: string): Promise<Message[]>;
  clearContext(userId: string): Promise<void>;
  addContext(userId: string, message: Message): Promise<void>;
}
```

PoC scope
- Groq integration for fast inference
- Minimal agent loop (message -> LLM -> response)
- Webhook handling for two-way messaging

Future direction
- Multi-model routing (OpenAI, Anthropic, Google, OpenRouter)
- Persistent context via storage adapters
- Function calling and tool execution
- Streaming responses and typing indicators
