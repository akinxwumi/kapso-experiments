export interface PaymentConfig {
  kapsoApiKey: string;
  phoneNumberId: string;
  providers: {
    stripe?: {
      secretKey: string;
      webhookSecret?: string;
    };
  };
  webhookUrl?: string; // Base URL for callbacks
  baseUrl?: string; // Optional API Base URL
  successMessage?: string; // Template: "Payment successful! {amount} {currency}"
  failedMessage?: string; // Template: "Payment failed. Please try again."
}

export interface PaymentRequest {
  to: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  paymentId: string;
  url: string;
  status: "pending" | "completed" | "failed";
}
