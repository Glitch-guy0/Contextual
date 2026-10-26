import { describe, expect, test } from "bun:test";
import { validateNodeInput, buildDocumentCard } from "../../packages/workspace/src/types.js";
import { AppProblemError } from "../../packages/contracts/src/errors.js";
import { notFound } from "../../packages/workspace/src/types.js";

describe("Milestone M4 — Story S4.2: Node Input Validation (pure, no database)", () => {
  test("TC-S4.2.1: a text node without content is rejected", () => {
    const result = validateNodeInput({ kind: "text", title: "Note" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("content_required_for_text");
      expect(result.issues[0]?.field).toBe("content");
    }
  });

  test("TC-S4.2.2: a document node without document_id is rejected", () => {
    const result = validateNodeInput({ kind: "document", title: "Paper" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("document_id_required_for_document");
      expect(result.issues[0]?.field).toBe("document_id");
    }
  });

  test("TC-S4.2.3: a blank or missing title is rejected", () => {
    for (const title of ["", "   ", undefined]) {
      const result = validateNodeInput({ kind: "text", title, content: "body" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("title_missing");
    }
  });

  test("TC-S4.2.4: valid text and document nodes are accepted", () => {
    expect(validateNodeInput({ kind: "text", title: "Note", content: "body" }).ok).toBe(true);
    expect(
      validateNodeInput({ kind: "document", title: "Paper", document_id: "d1" }).ok
    ).toBe(true);
  });

  test("TC-S4.2.5: a document node carries a card; a text node does not (FR-033)", () => {
    const documentCard = buildDocumentCard({
      title: "Attention Is All You Need",
      kind: "document",
      content: "Extracted text across 12 pages of the paper.",
      document_id: "doc-1",
    });
    expect(documentCard).not.toBeNull();
    expect(documentCard?.title).toBe("Attention Is All You Need");
    expect(documentCard?.page_count).toBe(12);
    expect(documentCard?.status).toBe("indexed");
    expect(documentCard?.preview.length).toBeLessThanOrEqual(500);

    expect(
      buildDocumentCard({ title: "Note", kind: "text", content: "x", document_id: null })
    ).toBeNull();
  });

  test("TC-S4.2.6: card preview is capped at 500 characters", () => {
    const card = buildDocumentCard({
      title: "Big",
      kind: "document",
      content: "a".repeat(5_000),
      document_id: "d2",
    });
    expect(card?.preview.length).toBe(500);
  });

  test("TC-S4.2.7: notFound maps to the closed-catalogue NOTEBOOK_NOT_FOUND key (M4-PM-001)", () => {
    const error = notFound("/api/v1/notebooks/{notebookId}/nodes");
    expect(error).toBeInstanceOf(AppProblemError);
    expect(error.key).toBe("NOTEBOOK_NOT_FOUND");

    const problem = error.toProblemDocument();
    expect(problem.status).toBe(404);
    expect(problem.type).toBe("https://contextual.ai/errors/notebook-not-found");
    expect(problem.title).toBe("Notebook Not Found");
    expect(problem.instance).toBe("/api/v1/notebooks/{notebookId}/nodes");
  });
});