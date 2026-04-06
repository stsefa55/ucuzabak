import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const SUBJ_MAX = 500;
const TO_MAX = 320;
const ERR_MAX = 8000;

export async function appendEmailDeliveryLog(entry: {
  jobName: string;
  toEmail: string;
  subject: string;
  status: EmailDeliveryStatus;
  errorText?: string | null;
  bullJobId?: string | null;
  retryPayload?: Prisma.InputJsonValue | null;
}): Promise<void> {
  try {
    await prisma.emailDeliveryLog.create({
      data: {
        jobName: entry.jobName,
        toEmail: entry.toEmail.slice(0, TO_MAX),
        subject: (entry.subject || "(konu yok)").slice(0, SUBJ_MAX),
        status: entry.status,
        errorText: entry.errorText ? entry.errorText.slice(0, ERR_MAX) : null,
        bullJobId: entry.bullJobId ? entry.bullJobId.slice(0, 128) : null,
        retryPayload:
          entry.retryPayload === undefined || entry.retryPayload === null
            ? undefined
            : entry.retryPayload
      }
    });
  } catch (e) {
    console.error("[email-delivery-log] yazılamadı:", e);
  }
}
