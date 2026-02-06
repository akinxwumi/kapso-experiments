# @kapso/agents

Minimal WhatsApp AI agent wrapper using Groq for LLM responses and Kapso webhooks for two-way messaging.

## Install

```bash
npm install @kapso/agents
```

## Usage

```ts
import { WhatsAppAgent } from "@kapso/agents";

const agent = new WhatsAppAgent({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
  phoneNumberId: process.env.PHONE_NUMBER_ID || "",
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL,
  },
  systemPrompt: "You are a helpful assistant.",
});

const response = await agent.chat({
  from: "+1234567890",
  message: "What can you do?",
});

await agent.sendMessage({
  to: "+1234567890",
  message: response.message,
});
```

## Webhook Usage (Two-Way Messaging)

Use your own webhook server to receive inbound messages from Kapso, pass them to the agent, and let it send replies.

```ts
import { WhatsAppAgent, verifySignature } from "@kapso/agents";

const agent = new WhatsAppAgent({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
  phoneNumberId: process.env.PHONE_NUMBER_ID || "",
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
  },
});

app.post("/webhook", async (req, res) => {
  const rawBody = req.rawBody ?? JSON.stringify(req.body);
  const signature = req.headers["x-webhook-signature"] as string | undefined;
  if (signature) {
    const valid = verifySignature({
      appSecret: process.env.WEBHOOK_SECRET || "",
      rawBody,
      signatureHeader: signature,
    });
    if (!valid) {
      res.status(401).send("Unauthorized");
      return;
    }
  }

  await agent.handleWebhook(req.body);
  res.sendStatus(200);
});
```

Notes:
- `handleWebhook` supports Kapso webhook payloads (v2) and Meta Graph payloads.
- Outbound/echo messages are ignored to avoid reply loops.
- `sendMessage()` accepts E.164 numbers (with `+`) or digit-only WhatsApp IDs.

## Configuration

- `KAPSO_API_KEY` (required)
- `PHONE_NUMBER_ID` (required)
- `GROQ_API_KEY` (required)
- `GROQ_MODEL` (optional)
- `groqBaseUrl` (optional)
- `systemPrompt` (optional)
- `contextWindow` (optional, default: 10)

## Webhook Signature Verification

Kapso webhooks include an `x-webhook-signature` header. Use the raw request body
when validating signatures.

```ts
import { verifyWebhookSignature } from "@kapso/agents";

const signature = req.headers["x-webhook-signature"] as string | undefined;
const isValid = signature
  ? verifyWebhookSignature({
      appSecret: process.env.KAPSO_APP_SECRET || "",
      rawBody, // Buffer or raw string (not JSON.stringify(req.body))
      signature,
    })
  : false;
```

Notes:
- Signature validation uses the app secret from your Kapso dashboard.
