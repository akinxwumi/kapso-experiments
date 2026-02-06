import { WhatsAppOTP } from "@kapso/auth";
import * as readline from "readline";

const otp = new WhatsAppOTP({
  kapsoApiKey: process.env.KAPSO_API_KEY || "",
  phoneNumberId: process.env.PHONE_NUMBER_ID || "",
  expiresIn: 120,
});

function promptForCode(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("\nEnter the OTP code you received: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  if (!process.env.KAPSO_API_KEY) {
    throw new Error("KAPSO_API_KEY is required");
  }

  if (!process.env.PHONE_NUMBER_ID) {
    throw new Error("PHONE_NUMBER_ID is required");
  }

  const to = process.env.TEST_PHONE_NUMBER || "+1234567890";

  console.log(`\nSending OTP to ${to}...`);

  const sendResult = await otp.send({
    to,
    brand: "Kapso Auth Demo",
    template: "{brand} OTP {code}",
  });

  console.log("Send result:", sendResult);

  // Check if OTP_CODE is set in env (for automated testing)
  let code = process.env.OTP_CODE || "";

  if (!code) {
    // Prompt for interactive input
    code = await promptForCode();

    if (!code) {
      console.log("\nNo code entered. Exiting...");
      return;
    }
  }

  console.log("\nVerifying code...");

  const verifyResult = await otp.verify({
    to,
    code,
  });

  console.log("Verify result:", verifyResult);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

