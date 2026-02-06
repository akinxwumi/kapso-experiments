# Auth Demo

This example demonstrates how to use the `@kapso/auth` package for WhatsApp OTP authentication.

## Prerequisites

1. A Kapso API key
2. A WhatsApp Business phone number ID
3. A test phone number to receive OTP codes

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
1. Send an OTP code to your configured test phone number via WhatsApp
2. Prompt you to enter the OTP code in the terminal
3. Verify the code you entered
4. Display the verification result

## Interactive Flow

```
Sending OTP to +1234567890...

Send result: { success: true, ... }

Please check your WhatsApp for the OTP code.
Enter the OTP code: 123456

Verifying OTP code: 123456...

Verify result: { valid: true, ... }
```

## Configuration

All configuration is done via environment variables in `examples/.env`:

- **KAPSO_API_KEY** (required): Your Kapso API key
- **PHONE_NUMBER_ID** (required): Your WhatsApp phone number ID
- **TEST_PHONE_NUMBER** (optional): Phone number to send OTP to (defaults to +1234567890)

## Features

- Interactive terminal-based OTP entry
- Secure OTP verification
- Clear console feedback with emojis
- Fast and simple to use


## Troubleshooting

**Error: "KAPSO_API_KEY is required"**
- Make sure you've created the `.env` file in the `examples/` directory
- Verify that `KAPSO_API_KEY` is set in the `.env` file

**Error: "PHONE_NUMBER_ID is required"**
- Make sure `PHONE_NUMBER_ID` is set in the `examples/.env` file

**OTP not received**
- Verify the phone number is in E.164 format (e.g., +1234567890)
- Check that your WhatsApp Business account is properly configured
- Ensure the phone number has WhatsApp installed
