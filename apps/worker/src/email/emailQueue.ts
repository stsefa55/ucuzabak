import { bullmqConnectionProducer } from "@ucuzabak/shared";
import { Queue } from "bullmq";

let emailQueue: Queue | null = null;

export function getEmailQueue(): Queue {
  if (!emailQueue) {
    emailQueue = new Queue("email", {
      connection: bullmqConnectionProducer()
    });
  }
  return emailQueue;
}
