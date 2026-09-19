# Contextual — Strategic Planning & Architectural Questionnaire

## Overview
This questionnaire addresses the critical architectural, product, and ergonomic decisions required to elevate **Contextual** from its previous v1 implementation into an exceptional, production-grade research platform. 

The previous plan established strong fundamentals: the **Deep Verification Loop** (PDF page jumps, synced YouTube timestamps, clean web reader), **strict grounded citation discipline**, and a distinct **Upgraded Modern Neo-Brutalist** aesthetic. However, several operational constraints in the earlier version (such as midnight auto-deletion, uncaptioned media rejection, and a hard 10-credit daily ceiling) introduce friction for power researchers.

Please review the following strategic questions. Your responses will directly shape the upcoming Product Requirements Document (PRD), Technical Architecture, and Implementation Roadmap.

---

### Question 1: Workspace Lifecycle — Ephemeral Auto-Deletion vs Persistent Storage

#### Overview
Determining whether user notebooks are temporary disposable sessions or persistent research libraries.

#### Context (Why with Example)
In the previous implementation (FR-18), notebooks were auto-deleted every night at 12:00 AM Asia/Kolkata (UTC+05:30), with a secondary 7-day inactivity TTL. 
- *Why this matters:* For hackathon demos or disposable sandbox environments, midnight auto-deletion prevents database bloat and controls storage costs. However, for real-world researchers like Elena (evaluating consensus protocol RFCs) or Marcus (compiling quarterly financial research), losing uploaded papers, highlights, and synthesized queries every midnight creates immense loss anxiety and destroys the long-term utility of the tool.
- *Example:* Elena spends 3 hours annotating a 40-page distributed systems paper. At 12:01 AM, her entire notebook and chat history are wiped by the background cleanup cron.

#### Options
- **Option A (Recommended — Persistent with Configurable Ephemerality):** Notebooks are persistent by default with permanent storage. Users can optionally toggle "Disposable / Ephemeral Mode" on individual notebooks if they want auto-cleanup after 24 hours.
- **Option B (Strict Ephemeral / Demo Sandbox):** Retain the scheduled midnight auto-deletion policy (12:00 AM IST) to emphasize ephemeral, zero-footprint research sessions.
- **Option C (Local-First Hybrid):** Store source documents and vectors locally in the browser (IndexedDB / OPFS / local vector store) so data never expires on the user's device, with optional cloud synchronization.

---

### Question 2: Multi-Modal Audio & Uncaptioned Video Processing

#### Overview
Handling multimedia files (YouTube videos, podcast recordings, internal meetings) that lack pre-existing captions.

#### Context (Why with Example)
In the previous implementation (FR-5, NG-1), YouTube ingestion required existing subtitle tracks; videos with disabled or missing captions failed immediately with an error. Uploading raw audio files (`.mp3`, `.wav`) was explicitly out of scope.
- *Why this matters:* A substantial portion of valuable research media (e.g., technical podcasts, startup pitch recordings, recorded academic colloquia, or international lectures) lacks human-written or auto-generated YouTube caption tracks. Rejecting these sources limits the platform's multi-modal promise.
- *Example:* Dev wants to synthesize an interview recording (`user-interview-04.mp3`) or an uncaptioned tech talk video. In v1, the upload is rejected, forcing him to leave the app, find an external transcription tool, export an `.srt` file, and upload that instead.

#### Options
- **Option A (Cloud Transcription Integration):** Integrate a fast, low-cost transcription pipeline (e.g., Groq Whisper API or Gemini Audio API) to automatically generate timestamped transcripts when a video or audio file lacks captions.
- **Option B (Client-Side In-Browser Transcription):** Use WebAssembly/WebGPU (e.g., Transformers.js with Whisper Tiny/Base) to run speech-to-text locally in the browser without server API costs.
- **Option C (Recommended for v1 Scope Boundary):** Retain the strict caption requirement for v1 (require `.srt`/`.vtt` or captioned YouTube) to preserve maximum shipping velocity, but add support for `.mp3`/`.wav` transcription in v1.1.

---

### Question 3: Daily Credit Governor vs Bring-Your-Own-Key (BYOK)

#### Overview
Balancing LLM inference cost protection with uninterrupted research velocity.

#### Context (Why with Example)
The previous build enforced a strict governor of 10 interaction credits per day (FR-16), locking the chat composer when exhausted until a rolling 24-hour reset.
- *Why this matters:* High-intensity research is iterative. Formulating a hypothesis, interrogating edge cases, and verifying citations across 4 complex papers routinely takes 25 to 50 questions in a single afternoon. A 10-query limit halts user productivity in 15 minutes.
- *Example:* Marcus is under a deadline to deliver an equity analysis memo. On question 10, the composer locks with a red banner: *"🔒 0/10 credits remaining. Composer disabled until reset at 12:00 AM IST."* Marcus cannot proceed unless he creates another account or waits 24 hours.

#### Options
- **Option A (Recommended — Free Tier + BYOK Support):** Maintain a default 10-credit daily allowance for free exploration, but provide an immediate setting to enter a personal API key (e.g., OpenAI, Anthropic, or Google Gemini) for unlimited, unmetered queries.
- **Option B (Local LLM Support):** Integrate with local inference engines (e.g. Ollama or WebLLM) allowing users with capable hardware to query entirely offline with zero credit deduction.
- **Option C (Increased Daily Quota / Session Replenishment):** Increase the free tier ceiling (e.g., 25–30 credits/day) with a faster rolling reset (e.g., 1 credit regenerated every 30 minutes).

---

### Question 4: PDF Deep Verification Precision — Coordinate Bounding Boxes

#### Overview
Technical precision of the cyan bounding-box highlight rendered over PDF documents in the Showcase pane.

#### Context (Why with Example)
In v1 (FR-14), the chunk schema recorded `{ sourceName, pageNumber }`. Highlighting on the PDF canvas relied on client-side text-layer matching in `PDF.js`.
- *Why this matters:* In academic papers with dense multi-column layouts, formulas, or financial 10-Ks with repeated headers ("Consolidated Statements of Operations"), client-side string matching can highlight the wrong occurrence or fail on hyphenated line breaks. Pre-computing bounding box coordinates `[x, y, width, height]` during ingestion guarantees pixel-perfect highlighting.
- *Example:* A citation refers to a theorem in column 2 of page 14. If text matching is fuzzy, the highlight box might snap to the abstract in column 1, causing momentary confusion for the auditor.

#### Options
- **Option A (Recommended — Ingestion-Time Coordinate Extraction):** Extract exact bounding boxes `[x0, y0, x1, y1]` during document chunking (using tools like PyMuPDF or pdfplumber) and store them in the chunk metadata. The frontend renders the highlight box with sub-millimeter precision.
- **Option B (Client-Side PDF.js Text Layer Search):** Keep ingestion fast and lightweight by storing only text and page numbers, letting `PDF.js` locate and highlight matching spans dynamically.
- **Option C (Hybrid):** Store exact bounding boxes when PDF text streams allow; fall back to page jump + fuzzy text anchor for scanned or irregular documents.

---

### Question 5: Web Search Fallback — Auto-Ingestion of Discovered Sources

#### Overview
Handling web search results returned during the Honest Refusal fallback loop.

#### Context (Why with Example)
When the active notebook lacks an answer, Contextual displays the Honest Refusal Card and allows the user to trigger a live web search (FR-10).
- *Why this matters:* If a user approves a web search and receives an answer citing external domains, they almost always want to ask follow-up questions. If the retrieved web content is not persisted into the notebook, the next query will refuse again and demand another web search credit.
- *Example:* Dev asks: *"What is Competitor X's SLA guarantee?"* The system searches the web via Tavily and answers: *"99.95% uptime as stated on their legal page [Web: competitorx.com/legal]"*. Dev then asks: *"Does that SLA include scheduled maintenance?"* Without auto-ingestion, the system has already discarded the web page and refuses again.

#### Options
- **Option A (Recommended — Auto-Ingest into Sources):** Automatically convert the top retrieved web article from the approved search into a permanent "Web Source" card in the Left Pane so subsequent conversation turns treat it as a native source.
- **Option B (Prompt to Add):** Below the synthesized web answer, provide a 1-click button: `[+ Add competitorx.com/legal to Notebook Sources]`.
- **Option C (Stateless Web Answer):** Keep web fallback strictly ephemeral (synthesize answer once, cite domain, do not modify notebook sources).

---

### Question 6: Research Export & Downstream Portability

#### Overview
Capabilities for exporting synthesized findings, verified citations, and notebooks into external tools.

#### Context (Why with Example)
The previous document did not specify an export mechanism; research stayed inside the web application.
- *Why this matters:* Contextual is a research tool, and the end product of research is almost always external—an architectural RFC in GitHub, an investment brief in Google Docs, or personal notes in Obsidian/Notion.
- *Example:* Elena completes a 2-hour audit of Raft vs Paxos. She needs to share her conclusions and cited sources with her engineering team in a Slack post or Markdown pull request. Currently, she must manually copy-paste individual chat bubbles.

#### Options
- **Option A (Recommended — Multi-Format Markdown & Clipboard Export):** 1-click export of the conversation or selected turns into clean Markdown with numbered footnote citations linking back to original sources (e.g. `[^1]: raft-consensus.pdf, p. 14`).
- **Option B (Obsidian / Notion Integration):** Export directly into Obsidian-compatible markdown vaults or Notion pages with preserved tag hierarchies.
- **Option C (Verifiable PDF Summary Report):** Generate a downloadable, branded Neo-Brutalist PDF report summarizing the inquiry, grounded answers, and embedded source excerpts.
