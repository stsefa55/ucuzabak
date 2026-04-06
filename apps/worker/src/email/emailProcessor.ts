import {
  resolveEmailVerificationTtlSeconds,
  resolvePasswordResetTtlSeconds,
  resolveStorefrontBaseUrlForBackend,
  type BulkEmailBatchJobData,
  type PriceAlertEmailJobData,
  type ResetPasswordEmailJobData,
  type TestEmailJobData,
  type VerifyEmailJobData,
  type WelcomeEmailJobData
} from "@ucuzabak/shared";
import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import { Job } from "bullmq";
import { createMailTransport, getFromAddress } from "./createMailer";
import { appendEmailDeliveryLog } from "./emailDeliveryLog";
import {
  priceAlertTemplate,
  resetPasswordTemplate,
  testEmailTemplate,
  verifyEmailTemplate,
  welcomeEmailTemplate
} from "./templates";

const transport = createMailTransport();
const from = getFromAddress();

function storefrontProductUrl(slug: string): string {
  const base = resolveStorefrontBaseUrlForBackend();
  return `${base}/urun/${encodeURIComponent(slug)}`;
}

function stripHtmlForText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function bullId(job: Job): string | null {
  return job.id != null ? String(job.id) : null;
}

async function sendOneAndLog(
  job: Job,
  jobName: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  retryData: Record<string, unknown>
): Promise<void> {
  const bid = bullId(job);
  try {
    await transport.sendMail({ from, to, subject, text, html });
    await appendEmailDeliveryLog({
      jobName,
      toEmail: to,
      subject,
      status: EmailDeliveryStatus.SENT,
      bullJobId: bid
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendEmailDeliveryLog({
      jobName,
      toEmail: to,
      subject,
      status: EmailDeliveryStatus.FAILED,
      errorText: msg,
      bullJobId: bid,
      retryPayload: { jobName, data: retryData } as Prisma.InputJsonValue
    });
    throw err;
  }
}

export async function processEmailJob(job: Job): Promise<void> {
  const name = job.name;

  if (name === "welcome_email") {
    const data = job.data as WelcomeEmailJobData;
    const { subject, html, text } = welcomeEmailTemplate({ name: data.name });
    await sendOneAndLog(job, name, data.to, subject, html, text, data as unknown as Record<string, unknown>);
    return;
  }

  if (name === "reset_password") {
    const data = job.data as ResetPasswordEmailJobData;
    const { subject, html, text } = resetPasswordTemplate(data.resetLink, resolvePasswordResetTtlSeconds());
    await sendOneAndLog(job, name, data.to, subject, html, text, data as unknown as Record<string, unknown>);
    return;
  }

  if (name === "verify_email") {
    const data = job.data as VerifyEmailJobData;
    const { subject, html, text } = verifyEmailTemplate(data.verifyLink, resolveEmailVerificationTtlSeconds());
    await sendOneAndLog(job, name, data.to, subject, html, text, data as unknown as Record<string, unknown>);
    return;
  }

  if (name === "price_alert") {
    const data = job.data as PriceAlertEmailJobData;
    const url = storefrontProductUrl(data.productSlug);
    const { subject, html, text } = priceAlertTemplate(
      { name: data.productName, url },
      data.price,
      data.currency,
      data.targetPrice
    );
    await sendOneAndLog(job, name, data.to, subject, html, text, data as unknown as Record<string, unknown>);
    return;
  }

  if (name === "test_email") {
    const data = job.data as TestEmailJobData;
    const { subject, html, text } = testEmailTemplate();
    await sendOneAndLog(job, name, data.to, subject, html, text, data as unknown as Record<string, unknown>);
    return;
  }

  if (name === "bulk_email_batch") {
    const data = job.data as BulkEmailBatchJobData;
    const textBody = data.text?.trim() || stripHtmlForText(data.html);
    const delayMs = Math.max(0, Math.min(500, Number(process.env.BULK_EMAIL_SEND_DELAY_MS ?? "60")));
    const bid = bullId(job);
    for (const to of data.recipients) {
      const addr = to?.trim();
      if (!addr) continue;
      try {
        await transport.sendMail({
          from,
          to: addr,
          subject: data.subject,
          html: data.html,
          text: textBody
        });
        await appendEmailDeliveryLog({
          jobName: name,
          toEmail: addr,
          subject: data.subject,
          status: EmailDeliveryStatus.SENT,
          bullJobId: bid
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await appendEmailDeliveryLog({
          jobName: name,
          toEmail: addr,
          subject: data.subject,
          status: EmailDeliveryStatus.FAILED,
          errorText: msg,
          bullJobId: bid,
          retryPayload: {
            jobName: name,
            data: {
              recipients: [addr],
              subject: data.subject,
              html: data.html,
              text: data.text
            } as BulkEmailBatchJobData
          } as Prisma.InputJsonValue
        });
      }
      if (delayMs > 0) await sleep(delayMs);
    }
    return;
  }

  throw new Error(`Bilinmeyen e-posta işi: ${name}`);
}
