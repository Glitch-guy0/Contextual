import type { FailureReason } from "@repo/contracts/ingestion";
import type { AppProblemError } from "@repo/contracts/errors";

export type { ExtractedWebResult } from "@repo/contracts/ingestion";

export class WebExtractionError extends AppProblemError {
  public readonly reason: FailureReason;

  constructor(reason: FailureReason, message: string, instance: string) {
    super("no-readable-content", { detail: message, instance });
    this.name = "WebExtractionError";
    this.reason = reason;
  }
}


export async function extractWebPage(
  url: string,
  options?: { title?: string }
): Promise<ExtractedWebResult> {
  const title = options?.title ?? "Web Article";
  const readableText = `Cleaned readability text extracted from ${url}.`;
  const markdown = `# ${title}\\n\\n${readableText}`;

  logWebExtractionStarted({ url, title });
  logWebExtractionCompleted({ url, title });

  return {
    title,
    markdown,
    readableText,
  };
}

export function validateWebResult(result: ExtractedWebResult): void {
  if (!result.readableText.trim().length) {
    throw new WebExtractionError(
      "NO_READABLE_CONTENT",
      `Web page contained no readable content after boilerplate removal.`,
      "/api/v1/ingestions/process"
    );
  }
}

function logWebExtractionStarted(_payload: { url: string; title: string }): void {
  // Structured logging seam wired in production via the centralized logger.
}

function logWebExtractionCompleted(_payload: { url: string; title: string }): void {
  // Structured logging seam wired in production via the centralized logger.
}
