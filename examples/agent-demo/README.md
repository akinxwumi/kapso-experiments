# Agent Demo

This example demonstrates how to use the `@kapso/agents` package with Groq and Kapso webhooks for two-way messaging.

## Prerequisites

1. A Kapso API key
2. A WhatsApp Business phone number ID
3. A Groq API key
4. A webhook URL reachable from Kapso (ngrok or similar)
5. A test phone number to receive the agent response

## Setup

1. **Configure environment variables** in the parent `examples/.env` file:
   ```bash
   cd ..
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Demo

```bash
npm start
```

The demo will:
1. Start a local HTTP server listening on port 3000 (or `PORT` env var).
2. Listen for WhatsApp Webhooks at `POST /webhook`.
3. Verify webhook signatures (if `WEBHOOK_SECRET` is set).
4. Process incoming messages using the agent and send replies via WhatsApp Cloud API (two-way).

## Exposing to the Internet

To receive webhooks from WhatsApp, your local server must be accessible from the internet. You can use tools like `ngrok`:

```bash
ngrok http 3000
```

Then configure your Kapso webhook URL to: `https://<your-ngrok-url>/webhook`.

## Configuration

All configuration is done via environment variables in `examples/.env`:

- **KAPSO_API_KEY** (required)
- **PHONE_NUMBER_ID** (required)
- **GROQ_API_KEY** (required)
- **WEBHOOK_SECRET** (optional, used to verify `x-webhook-signature`)
- **GROQ_MODEL** (optional)
- **GROQ_BASE_URL** (optional)
- **AGENT_SYSTEM_PROMPT** (optional)
- **TEST_PHONE_NUMBER** (optional)
