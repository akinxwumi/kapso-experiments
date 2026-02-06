import { WhatsAppAgent, verifySignature } from "@kapso/agents";
import * as http from "http";

const agent = new WhatsAppAgent({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
  phoneNumberId: process.env.PHONE_NUMBER_ID || "",
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: sanitizeOptional(process.env.GROQ_MODEL),
  },
  systemPrompt: sanitizeOptional(process.env.AGENT_SYSTEM_PROMPT),
  groqBaseUrl: sanitizeOptional(process.env.GROQ_BASE_URL),
});

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

if (!WEBHOOK_SECRET) {
  console.warn("Missing WEBHOOK_SECRET in .env");
  console.warn("Webhook verification will be skipped or fail if signature is present.");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // Verification endpoint (GET)
  if (req.method === "GET" && url.pathname === "/webhook") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      console.log("Webhook verified successfully.");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(challenge);
    } else {
      console.log("Webhook verification failed.");
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
    }
    return;
  }

  // Event notification endpoint (POST)
  if (req.method === "POST" && url.pathname === "/webhook/whatsapp") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      if (WEBHOOK_SECRET) {
        console.log("Request Headers:", JSON.stringify(req.headers, null, 2));
        // Support both standard Meta signature and Kapso signature
        const signature = (req.headers["x-hub-signature-256"] || req.headers["x-webhook-signature"]) as string;
        console.log("Verifying signature...");
        console.log("Signature:", signature);
        console.log("App Secret length:", WEBHOOK_SECRET.length);
        console.log("Body length:", body.length);

        if (!verifySignature({ appSecret: WEBHOOK_SECRET, rawBody: body, signatureHeader: signature })) {
          console.error("Invalid signature");
          res.writeHead(401, { "Content-Type": "text/plain" });
          res.end("Unauthorized");
          return;
        }
      }

      try {
        const payload = JSON.parse(body);
        console.log("Received webhook payload:", JSON.stringify(payload, null, 2));
        await agent.handleWebhook(payload);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
      } catch (error) {
        console.error("Error processing webhook:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  if (!process.env.KAPSO_API_KEY || !process.env.GROQ_API_KEY) {
    console.error("Missing required API keys. Please check your .env file.");
    process.exit(1);
  }
  console.log(`Server listening on port ${PORT}`);
  console.log(`Expose this server to the internet using ngrok or similar.`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
});

function sanitizeOptional(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
