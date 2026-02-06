import { WhatsAppWorkflows } from "@kapso/workflows";
import * as http from "http";

const kapsoApiKey = process.env.KAPSO_API_KEY;
const makeWebhookUrl = sanitizeOptional(process.env.MAKE_WEBHOOK_URL);
const port = Number(process.env.PORT || 3000);

if (!kapsoApiKey) {
  throw new Error("KAPSO_API_KEY is required");
}

if (!makeWebhookUrl) {
  throw new Error("MAKE_WEBHOOK_URL is required");
}

const workflows = new WhatsAppWorkflows({
  kapsoApiKey,
});

workflows.on("message.received", async (event) => {
  logWithTime("Kapso event received: message.received");
  logWithTime("Sending event to Make.com.");
  await workflows.triggerMake(makeWebhookUrl, event);
  logWithTime("Make.com webhook request succeeded.");
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && url.pathname === "/webhook/whatsapp") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      logWithTime("Inbound Kapso webhook received.");
      try {
        const payload = JSON.parse(body);
        await workflows.handleWebhook(payload);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
      } catch (error) {
        console.error("Webhook handling error:", error);
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad Request");
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(port, () => {
  logWithTime(`Workflow demo listening on port ${port}`);
  logWithTime(`Webhook URL: http://localhost:${port}/webhook/whatsapp`);
  logWithTime("Expose this server to the internet using ngrok or similar.");
});

function sanitizeOptional(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function logWithTime(message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
}
