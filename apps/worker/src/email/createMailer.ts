import nodemailer from "nodemailer";

export function createMailTransport() {
  const host = process.env.SMTP_HOST || "localhost";
  const port = Number(process.env.SMTP_PORT || 1025);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });
}

export function getFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim();
  if (from) return from;
  return `"UcuzaBak" <noreply@ucuzabak.com>`;
}
