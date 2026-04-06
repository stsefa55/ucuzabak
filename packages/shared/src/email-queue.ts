/**
 * BullMQ "email" kuyruğu: API iş üretir, worker SMTP ile gönderir.
 * job.name: welcome_email | reset_password | verify_email | price_alert | test_email | bulk_email_batch
 */

export const EMAIL_QUEUE_NAME = "email" as const;

export type EmailJobName =
  | "welcome_email"
  | "reset_password"
  | "verify_email"
  | "price_alert"
  | "test_email"
  | "bulk_email_batch";

/** Toplu duyuru: worker dizideki her alıcıya aynı içeriği gönderir (batch başına bir iş). */
export type BulkEmailBatchJobData = {
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
};

export type WelcomeEmailJobData = {
  to: string;
  name: string;
};

export type ResetPasswordEmailJobData = {
  to: string;
  resetLink: string;
};

export type VerifyEmailJobData = {
  to: string;
  verifyLink: string;
};

export type PriceAlertEmailJobData = {
  to: string;
  productName: string;
  productSlug: string;
  price: string;
  currency: string;
  targetPrice: string;
};

/** Admin SMTP doğrulama (basit içerik). */
export type TestEmailJobData = {
  to: string;
};
