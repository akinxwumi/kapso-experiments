# @kapso/workflows

Event-driven WhatsApp workflows with Make.com webhooks. This is a proof of concept for Kapso SDK-driven automation.

## Install

```bash
npm install @kapso/workflows
```

## Quickstart

```ts
import { WhatsAppWorkflows } from "@kapso/workflows";

const workflows = new WhatsAppWorkflows({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
});

workflows.on("message.received", async (event) => {
  await workflows.triggerMake(process.env.MAKE_WEBHOOK_URL || "", event);
});
```

## Webhook Handling

Use your own server to receive Kapso webhooks and forward them to the workflow engine.

```ts
import { WhatsAppWorkflows } from "@kapso/workflows";

const workflows = new WhatsAppWorkflows({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
});

app.post("/webhook", async (req, res) => {
  await workflows.handleWebhook(req.body);
  res.sendStatus(200);
});
```

Notes:
- `handleWebhook` expects Kapso webhook payloads (e.g. `type`, `from`, `to`, `message`).
- Events with missing `from`/`to` or unknown `type` are ignored.

## Make.com Usage (PoC)

Make.com's **Webhook** module provides a webhook URL. Pass it directly to `triggerMake()`.

```ts
await workflows.triggerMake("https://hook.make.com/...", {
  from: "+1234567890",
  text: "New inbound message",
});
```

You can also map webhook URLs in config and call `triggerMakeById()` with a key:

```ts
const workflows = new WhatsAppWorkflows({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
  make: {
    webhooks: {
      "support-make": "https://hook.make.com/...",
    },
  },
});

await workflows.triggerMakeById("support-make", { message: "Hello" });
```

## Configuration

- `kapsoApiKey` (required)
- `make.webhooks` (optional): map of keys to Make.com webhook URLs

## Events

Supported event types:
- `message.received`
- `message.sent`
- `message.delivered`
- `message.read`
- `button.clicked`
- `list.selected`
- `conversation.started`
- `conversation.ended`

## Workflow Helpers

- `condition(predicate)` → create a conditional chain with `.then()` and `.otherwise()`
- `delay(ms)` → wait helper
- `retry(fn, options)` → retry with backoff
