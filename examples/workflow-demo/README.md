# Workflow Demo

This example demonstrates how to use the `@kapso/workflows` package to forward Kapso webhook events to Make.com.

## Prerequisites

1. A Kapso API key
2. A Make.com webhook URL
3. A webhook URL reachable from Kapso (ngrok or similar)

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
1. Start a local HTTP server listening on port 3000 (or `PORT` env var)
2. Listen for Kapso webhooks at `POST /webhook/whatsapp`
3. Trigger your Make.com webhook when a `message.received` event arrives

## Exposing to the Internet

To receive webhooks from Kapso, your local server must be accessible from the internet. You can use tools like `ngrok`:

```bash
ngrok http 3000
```

Then configure your Kapso webhook URL to: `https://<your-ngrok-url>/webhook/whatsapp`.

## Configuration

All configuration is done via environment variables in `examples/.env`:

- **KAPSO_API_KEY** (required)
- **MAKE_WEBHOOK_URL** (required)
- **PORT** (optional)
