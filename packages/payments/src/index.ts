import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";
import Stripe from "stripe";
import { PaymentConfig, PaymentRequest, PaymentResponse } from "./types.js";

export class WhatsAppPayments {
  private stripe?: Stripe;
  private client: WhatsAppClient;
  private config: PaymentConfig;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.client = new WhatsAppClient({
      kapsoApiKey: config.kapsoApiKey,
      baseUrl: config.baseUrl || "https://api.kapso.ai/meta/whatsapp",
    });

    if (config.providers.stripe?.secretKey) {
      this.stripe = new Stripe(config.providers.stripe.secretKey, {
        apiVersion: "2024-04-10",
        httpClient: Stripe.createNodeHttpClient(),
      });
    }
  }

  async request(params: PaymentRequest): Promise<PaymentResponse> {
    if (!this.stripe) {
      throw new Error("Stripe is not configured");
    }

    const { to, amount, currency, description, metadata } = params;

    // Create Stripe Session
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: this.config.webhookUrl ? `${this.config.webhookUrl}/success` : "https://example.com/success",
      cancel_url: this.config.webhookUrl ? `${this.config.webhookUrl}/cancel` : "https://example.com/cancel",
      metadata: {
        ...metadata,
        customer_phone: to,
      },
      payment_intent_data: {
        metadata: {
          ...metadata,
          customer_phone: to,
        },
      },
    };

    const session = await this.stripe.checkout.sessions.create(sessionData);

    if (!session.url) {
      throw new Error("Failed to create Stripe session URL");
    }

    // Send WhatsApp Message
    try {
      await this.client.messages.sendInteractiveCtaUrl({
        phoneNumberId: this.config.phoneNumberId,
        to: to.replace(/^\+/, ""), // WhatsApp API expects number without +
        bodyText: `Payment Request: ${description}\nAmount: ${amount.toFixed(2)} ${currency.toUpperCase()}`,
        parameters: {
          displayText: "Pay Now",
          url: session.url,
        },
      });
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      // We still return success as the payment session was created
    }

    return {
      paymentId: session.id,
      url: session.url,
      status: "pending",
    };
  }

  async handleStripeWebhook(body: string | Buffer, signature: string): Promise<void> {
    if (!this.stripe || !this.config.providers.stripe?.webhookSecret) {
      throw new Error("Stripe webhook secret is missing");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.config.providers.stripe.webhookSecret
      );
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        await this.sendNotification(session, this.config.successMessage || "Payment successful! Thank you for your payment of {amount} {currency}.");
      }
    } else if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (this.config.failedMessage) {
        await this.sendNotification(session, this.config.failedMessage);
      }
    } else if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.status === "succeeded") {
        await this.sendNotification(intent, this.config.successMessage || "Payment successful! Thank you for your payment of {amount} {currency}.");
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (this.config.failedMessage) {
        await this.sendNotification(intent, this.config.failedMessage);
      }
    } else {
      console.log(`[WhatsAppPayments] Ignored event type: ${event.type}`);
    }
  }

  private async sendNotification(obj: Stripe.Checkout.Session | Stripe.PaymentIntent, template: string): Promise<void> {
    const phone = obj.metadata?.customer_phone;
    if (!phone) {
      console.log(`[WhatsAppPayments] No customer_phone found in metadata for ${obj.object} ${obj.id}. Cannot send notification.`);
      return;
    }

    let amount = 0;
    let currency = "";

    if (obj.object === "checkout.session") {
      const session = obj as Stripe.Checkout.Session;
      amount = (session.amount_total || 0) / 100;
      currency = session.currency?.toUpperCase() || "";
    } else if (obj.object === "payment_intent") {
      const intent = obj as Stripe.PaymentIntent;
      amount = (intent.amount || 0) / 100;
      currency = intent.currency.toUpperCase();
    }

    const message = template
      .replace("{amount}", amount.toFixed(2))
      .replace("{currency}", currency);

    try {
      await this.client.messages.sendText({
        phoneNumberId: this.config.phoneNumberId,
        to: phone.replace(/^\+/, ""),
        body: message,
      });
      console.log(`[WhatsAppPayments] sent confirmation message to ${phone}`);
    } catch (error) {
      console.error("Failed to send WhatsApp notification", error);
    }
  }
}

export * from "./types.js";
