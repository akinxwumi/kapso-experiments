import dns from "node:dns";
// Force IPv4 for all DNS lookups to avoid IPv6 timeout issues
const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = (hostname: string, options: any, callback: any) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  } else if (!options) {
    options = {};
  }

  // Force IPv4
  const newOptions = typeof options === 'object' ? { ...options, family: 4 } : { family: 4 };
  return originalLookup(hostname, newOptions, callback);
};

import express from "express";
import { WhatsAppPayments } from "@kapso/payments";

// Env vars
const PORT = process.env.PORT || 3000;
const KAPSO_API_KEY = process.env.KAPSO_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER;
const PAYMENT_WEBHOOK_URL = process.env.PAYMENT_WEBHOOK_URL;

if (
  !KAPSO_API_KEY ||
  !PHONE_NUMBER_ID ||
  !STRIPE_SECRET_KEY ||
  !STRIPE_WEBHOOK_SECRET ||
  !PAYMENT_WEBHOOK_URL
) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

const payments = new WhatsAppPayments({
  kapsoApiKey: KAPSO_API_KEY,
  phoneNumberId: PHONE_NUMBER_ID,
  providers: {
    stripe: {
      secretKey: STRIPE_SECRET_KEY,
      webhookSecret: STRIPE_WEBHOOK_SECRET,
    },
  },
  webhookUrl: PAYMENT_WEBHOOK_URL,
  successMessage: "Payment received! Thanks for your {amount} {currency}.",
  failedMessage: "Payment failed. Please try again.",
});

const app = express();

// Stripe requires raw body for signature verification
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Received Stripe webhook request");
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).send("No signature");
      return;
    }

    try {
      await payments.handleStripeWebhook(req.body, signature as string);
      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/success", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: green;">Payment Successful!</h1>
        <p>You can close this window and return to WhatsApp.</p>
      </body>
    </html>
  `);
});

app.get("/cancel", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: red;">Payment Cancelled</h1>
        <p>You can close this window.</p>
      </body>
    </html>
  `);
});

// WhatsApp webhook - just acknowledge
app.post("/webhook/whatsapp", express.json(), (req, res) => {
  // Always return 200 to Kapso/Meta to prevent retries
  res.status(200).send("OK");
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Stripe Webhook URL should be: ${PAYMENT_WEBHOOK_URL}/webhook/stripe`);

  // Trigger payment request immediately
  if (TEST_PHONE_NUMBER) {
    console.log(`Sending payment request to ${TEST_PHONE_NUMBER}...`);
    try {
      const response = await payments.request({
        to: TEST_PHONE_NUMBER,
        amount: 10.00,
        currency: "USD",
        description: "Demo",
      });
      console.log("Payment requested successfully:", response);
    } catch (error) {
      console.error("Failed to request payment:", error);
    }
  } else {
    console.log("No TEST_PHONE_NUMBER provided, skipping automatic request.");
  }
});
