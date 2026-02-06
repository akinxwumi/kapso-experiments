# @kapso/auth

WhatsApp OTP authentication wrapper for Kapso. Send OTPs and verify codes with a minimal API.

## Install

```bash
npm install @kapso/auth
```

## Quickstart

```ts
import { WhatsAppOTP } from "@kapso/auth";

const otp = new WhatsAppOTP({
  kapsoApiKey: process.env.KAPSO_API_KEY!,
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
});

// Send an OTP
const sendResult = await otp.send({
  to: "+1234567890",
  brand: "Acme",
  template: "{brand} verification code: {code}",
});

// Verify an OTP
const verifyResult = await otp.verify({
  to: "+1234567890",
  code: "123456",
});

console.log({ sendResult, verifyResult });
```

## Configuration

- `kapsoApiKey` (required)
- `phoneNumberId` (required)
- `codeLength` (optional, `4 | 6 | 8`, default: `6`)
- `expiresIn` (optional, seconds, default: `300`)
- `maxAttempts` (optional, default: `3`)
- `resendCooldown` (optional, seconds, default: `30`)
- `baseUrl` (optional, default: `https://api.kapso.ai/meta/whatsapp`)

## Notes

- Phone numbers must be E.164 (e.g., `+1234567890`).
- `send()` returns an error if the resend cooldown is still active.
- This package currently uses in-memory storage only (single-instance).

## Future Features (Roadmap)

This package is a proof of concept. Planned additions to make it production-ready:

- **Buttons**: WhatsApp-native buttons for one-tap verification and resend.
- **Webhook handling**: Built-in handlers for button click and verification events.
- **Flows**: Composable, multi-step auth flows (e.g., verify + consent + profile capture).
- **Storage adapters (package-level)**: Pluggable Redis/DB stores for multi-instance deployments.

With these features, developers should be able to build richer auth use cases in fewer than 10 lines of code.
