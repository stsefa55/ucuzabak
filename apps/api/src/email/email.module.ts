import { Global, Module } from "@nestjs/common";
import { EmailQueueService } from "./email-queue.service";

@Global()
@Module({
  providers: [EmailQueueService],
  exports: [EmailQueueService]
})
export class EmailModule {}
