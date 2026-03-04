import { createRequire } from "node:module";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

interface FinalFailureEmailInput {
  recipientEmail: string;
  recipientName?: string;
  automationId: string;
  automationName: string;
  runId: string;
  status: "failed" | "timed_out" | "killed";
  attempt: number;
  maxAttempts: number;
  error: string | null;
}

type MailTransporter = {
  sendMail(args: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
};

const require = createRequire(import.meta.url);

let transporter: MailTransporter | null = null;
let disabledReason: string | null = null;

function getTransporter(): MailTransporter | null {
  if (disabledReason) {
    return null;
  }

  if (!env.MAIL_USER || !env.MAIL_PASS) {
    disabledReason = "MAIL_USER/MAIL_PASS not configured";
    logger.warn({ reason: disabledReason }, "Failure emails are disabled");
    return null;
  }

  if (!transporter) {
    try {
      const nodemailer = require("nodemailer") as {
        createTransport(config: {
          service: string;
          auth: { user: string; pass: string };
        }): MailTransporter;
      };
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.MAIL_USER,
          pass: env.MAIL_PASS
        }
      });
    } catch (error) {
      disabledReason = "nodemailer package is not installed";
      logger.error({ err: error, reason: disabledReason }, "Failure emails are disabled");
      return null;
    }
  }

  return transporter;
}

export async function sendRunFailedAfterRetriesEmail(input: FinalFailureEmailInput): Promise<void> {
  const client = getTransporter();
  if (!client) {
    return;
  }
  const senderEmail = env.MAIL_USER;
  if (!senderEmail) {
    return;
  }

  const runUrl = `${env.FRONTEND_ORIGIN}/automations/${input.automationId}/runs`;
  const greetingName = input.recipientName?.trim() || "there";
  const subject = `Automation failed after retries: ${input.automationName}`;
  const text = [
    `Hi ${greetingName},`,
    "",
    "Your scheduled automation failed after all retry attempts.",
    "",
    `Automation: ${input.automationName} (${input.automationId})`,
    `Run ID: ${input.runId}`,
    `Status: ${input.status}`,
    `Attempts: ${input.attempt}/${input.maxAttempts}`,
    `Error: ${input.error ?? "No error message provided"}`,
    "",
    `View runs: ${runUrl}`
  ].join("\n");

  try {
    await client.sendMail({
      from: senderEmail,
      to: input.recipientEmail,
      subject,
      text
    });

    logger.info(
      {
        automationId: input.automationId,
        runId: input.runId,
        recipientEmail: input.recipientEmail,
        attempt: input.attempt,
        maxAttempts: input.maxAttempts
      },
      "Final failure email sent"
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        automationId: input.automationId,
        runId: input.runId,
        recipientEmail: input.recipientEmail
      },
      "Final failure email failed"
    );
  }
}
