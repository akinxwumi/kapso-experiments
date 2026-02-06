# Kapso Experiments

Kapso is the fastest way for developers to add WhatsApp to their products. The DX is by far better than Meta's raw API, and it's ~95% cheaper than Twilio, with observability and even sophisticated features like WhatsApp flows/buttons built in. But I imagined that the mid-long term goal is to be an orchestration layer for WhatsApp, not just the messaging layer.

In short and for lack of a better term: **WhatsApp-backend-as-a-service**.

A good example probably for me is Supabase: it turned a narrow wedge (better Postgres DX compared to Firebase) into a broader platform by offering clean primitives that are fully integrated (auth, storage, functions, realtime). I see Kapso in a similar light, but for WhatsApp (and who knows maybe Telegram, and other messaging platforms in the future).

And the timing is right: WhatsApp Business API is opened to all developers (the platform risk is reduced), the adoption of WhatsApp in the US is growing rapidly, and AI agents need infrastructure like this. Kapso is positioned to be the platform of choice for this wave which is what I find most exciting.

So, this repo is a proof-of-concept exploration of Kapso by me as an orchestration layer for building on WhatsApp, using a small set of primitives that can be composed into fully-fledged products.

My main thesis is that developers already treat WhatsApp as an authenticated, persistent session. Kapso removes the API friction; the next step is removing the product friction. If so, Kapso can provide the primitives for auth, payments, workflows, and AI,among others, which further consolidates it as the preferred platform for building on WhatsApp.

An example end-to-end product that could be built with these primitives is an agentic commerce on WhatsApp:
- A customer starts a conversation, gets verified with WhatsApp OTP using the Kapso auth.
- An AI agent helps discover products, answers questions, and builds the cart using the AI orchestrator.
- Payment completes inside the thread via the Kapso payments primitive.
- Post-purchase events sync to CRM, Slack, or Sheets via Kapso workflows.

All these inside WhatsApp and with a single SDK. It doesn't feel bloated whatsoever.

So, I implemented some of these primitives as wrappers to the Kapso TypeScript SDK. I should note that they are right now proof of concepts (prototypes), and nothing close to production-grade. I built them quickly (with Codex) to share with the hope that they make a compelling case for my application for the founding engineer role at Kapso.


## The Primitives

| Package | Purpose | Demo |
| --- | --- | --- |
| [@kapso/auth](packages/auth/README.md) | OTP authentication over WhatsApp. Eliminates Twilio Verify-style costs with a clean, typed API. | [auth-demo](examples/auth-demo/README.md) |
| [@kapso/payments](packages/payments/README.md) | In-conversation payments with Stripe, with webhook-confirmed success messages. | [payment-demo](examples/payment-demo/README.md) |
| [@kapso/workflows](packages/workflows/README.md) | Event-driven WhatsApp workflows via Make.com webhooks (PoC for automation layer). | [workflow-demo](examples/workflow-demo/README.md) |
| [@kapso/agents](packages/agents/README.md) | Conversational AI agents on WhatsApp using Groq for fast LLM inference. | [agent-demo](examples/agent-demo/README.md) |

Installation and usage details are included in each package's README. I also included a [spec](spec.md) for a more comprehensive breakdown of the primitives.