import { finishPublishingJobStep, publishDestinationStep } from "@/workflows/publishing/steps";
import type { PublishEventPayload } from "@/workflows/publishing/types";

export async function publishEventWorkflow(payload: PublishEventPayload) {
  "use workflow";
  const results: { destination: (typeof payload.destinations)[number]; status: string }[] = [];
  for (const destination of payload.destinations) {
    try {
      results.push(await publishDestinationStep(payload, destination));
    } catch {
      results.push({ destination, status: "failed" });
    }
  }
  return finishPublishingJobStep(payload.jobId, results);
}
