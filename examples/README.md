# Kapso Examples

This directory contains example implementations demonstrating how to use various Kapso packages.

## Setup

All examples share a common environment configuration. Before running any example:

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables in `.env`:**
   - `KAPSO_API_KEY`: Your Kapso API key
   - `PHONE_NUMBER_ID`: Your WhatsApp phone number ID
   - `TEST_PHONE_NUMBER`: The phone number to use for testing (in E.164 format, e.g., +1234567890)
   - `STRIPE_SECRET_KEY`: Stripe secret key (for payment demo)
   - `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret (optional)
   - `PAYMENT_WEBHOOK_URL`: Webhook URL for payment events (optional)
   - `PORT`: Port for the payment webhook server (optional)
   - `PAYMENT_SUCCESS_URL`: Redirect after payment success (optional)
   - `PAYMENT_CANCEL_URL`: Redirect after payment cancel (optional)
   - `GROQ_API_KEY`: Groq API key (for agent demo)
   - `GROQ_MODEL`: Groq model id (optional)
   - `GROQ_BASE_URL`: Groq API base URL (optional)
   - `AGENT_SYSTEM_PROMPT`: System prompt for the agent (optional)
   - `MAKE_WEBHOOK_URL`: Make.com webhook URL (for workflow demo)

## Available Examples

### auth-demo

Demonstrates WhatsApp OTP authentication using the `@kapso/auth` package.

**Features:**
- Send OTP codes via WhatsApp
- Interactive terminal-based OTP verification
- No need to hardcode OTP in environment variables

**Running the demo:**
```bash
cd auth-demo
npm install
npm start
```

The demo will:
1. Send an OTP to the configured test phone number
2. Prompt you to enter the OTP code received via WhatsApp
3. Verify the entered code

### payment-demo

Demonstrates WhatsApp payments using the `@kapso/payments` package with Stripe.

**Features:**
- Send a payment request via WhatsApp
- Receive a Stripe checkout link
- Handle Stripe webhooks and send a success message on completion

**Running the demo:**
```bash
cd payment-demo
npm install
npm start
```

### agent-demo

Demonstrates an AI agent response using the `@kapso/agents` package and Groq.

**Features:**
- Generate a response with an LLM
- Send the response back over WhatsApp

**Running the demo:**
```bash
cd agent-demo
npm install
npm start
```

### workflow-demo

Demonstrates forwarding Kapso webhook events to Make.com using `@kapso/workflows`.

**Features:**
- Receives `message.received` events from Kapso
- Sends the event payload to a Make.com webhook

**Running the demo:**
```bash
cd workflow-demo
npm install
npm start
```

## Environment Variables

The `.env` file in this directory is used by all examples. Make sure to:
- Never commit your `.env` file to version control
- Keep your API keys secure
- Update the `.env.example` file if you add new required variables

## Adding New Examples

When creating a new example:

1. Create a new directory under `examples/`
2. Add a `package.json` with appropriate dependencies
3. Document any example-specific configuration in the example's directory
4. Update this README with information about your new example
5. Use the shared `.env` file for configuration (access via `process.env`)
