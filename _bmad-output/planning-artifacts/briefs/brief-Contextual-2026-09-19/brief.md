---
title: "Product Brief: Contextual — Grounded Multi-Modal Research Workspace"
status: draft
created: 2026-09-19
updated: 2026-09-19
author: "Mary (Business Analyst) 📊"
project: Contextual
version: "2.0-planning"
---

# Product Brief: Contextual

## 1. Executive Summary

Knowledge work in high-stakes domains—distributed systems engineering, equity research, legal audits, and technical product management—has become an exercise in cognitive fragmentation. Researchers routinely juggle dozens of heterogeneous source artifacts across PDFs, live documentation, YouTube technical lectures, and interview transcripts. Current conversational AI tools exacerbate this friction rather than resolving it: general LLMs hallucinate plausible untruths, while even specialized tools like Google's NotebookLM offer only surface-level verification via isolated excerpt snippets disconnected from their source contexts.

**Contextual** is an opinionated, high-velocity personal research workspace designed to make verification instantaneous and unassailable. Anchored by the **Deep Verification Loop**, Contextual strictly confines conversational answers to the user's active notebook materials. Every factual assertion maps to an interactive, high-contrast inline citation pill (`[1]`). Clicking a pill immediately summons the **Original View Showcase**, navigating directly to the source artifact in its native environment: jumping to the exact page of a multi-page PDF with a cyan bounding-box overlay, seeking an embedded YouTube video directly to the cited second mark with synchronized autoscrolling transcript dialogue, or highlighting a clean web reader.

Presented through an **upgraded Modern Neo-Brutalist design language** (bold 2px ink borders, solid zero-blur offset drop shadows, slanted high-energy buttons, and electric cyan verification accents), Contextual transforms research from an anxious cross-checking chore into an authoritative, tactile, and audit-ready workflow.

---

## 2. The Problem: The Verification Gap & Fragmented Ingestion

### 2.1 The Hallucination & Broad-Corpora Bleed
Standard AI chatbots draw on billions of web tokens rather than strictly respecting reference files. When a researcher queries an internal whitepaper or technical lecture, conversational models blend pre-training biases with user material. In technical and financial research, a plausible-sounding falsehood is more dangerous than an outright failure.

### 2.2 The Shallow Citation Verification Trap
Existing document-QA products isolate citations into detached text snippets shown in sidebars. The user cannot see the surrounding paragraphs, diagrams, mathematical equations, or speaker delivery. Re-locating that quote inside a 40-page PDF or a 90-minute lecture video takes minutes of manual searching, breaking the researcher's flow state.

### 2.3 Silent Ingestion Anxiety
Most document AI platforms fail quietly when handling edge-case files—such as uncaptioned videos, paywalled links, or complex tables. Users are left guessing whether their file was indexed or silently discarded.

---

## 3. The Solution: Contextual

Contextual unifies multi-modal intake, strictly grounded conversational synthesis, and instant primary-source verification in a single synchronized tri-pane workstation:

1. **Multi-Modal Notebook Ingestion:** Drop multi-page PDFs, YouTube URLs, web links, subtitle files (`.srt`/`.vtt`), or raw markdown into an active notebook. Real-time telemetry badges (`queued` → `indexing` → `ready` / `failed`) ensure zero ambiguity.
2. **Strict Grounded Synthesis:** Every generated response is synthesized *only* from retrieved notebook chunks. If the notebook lacks the required facts, Contextual produces an **Honest Refusal Card** with an approval-gated web search fallback button (`[Search Web & Answer]`), never fabricating claims.
3. **The Deep Original View (Showcase):** Single-clicking any citation pill (`[1]`) immediately directs the right-hand inspection canvas to the exact primary source:
   - **PDF:** Instantly renders the target page with a semi-transparent cyan bounding-box highlight over the cited paragraph.
   - **YouTube / Transcripts:** Seeks the embedded video player to the exact second mark, with live autoscrolling and highlight synchronization across the transcript text.
   - **Web / Text:** Scrolls the reader directly to the referenced sentence with an active highlight ring and external canonical linkout.
4. **Modern Neo-Brutalist Ergonomics:** Engineered with high-contrast visual cues, `Space Mono` receipt-like monospace numerics, tactile slanted buttons, and global keyboard shortcuts (`⌘K`, `/`, `[` / `]`).

---

## 4. What Makes Contextual Different

| Strategic Dimension | General Chatbots (ChatGPT / Claude) | Google NotebookLM | Contextual |
|---|---|---|---|
| **Grounding Scope** | Open web weights (hallucinations frequent) | Restricted to user files | Strictly isolated to active notebook chunks |
| **Verification Depth** | Web linkout or none | Side-drawer text snippet | **Deep Original View:** Full native PDF page render with bounding box; synchronized video seek |
| **Information Gap Behavior**| Fabricates plausible answers | States missing context passively | **Honest Refusal Card** with explicit user-gated web search fallback |
| **Interface Aesthetics** | Sterile corporate SaaS minimal | Corporate Material Design | **Upgraded Modern Neo-Brutalism:** High-contrast 2px ink borders, solid shadows, tactile slant |
| **Ergonomics & Control** | Simple chat feed | Limited document inspection | Tri-pane workstation with full keyboard navigation & sub-second jump latency |

---

## 5. Who This Serves: Personas & Jobs-to-be-Done

### Primary Personas
- **Elena (Staff Distributed Systems Engineer):** Audits consensus specifications, RFCs, and recorded conference keynotes. Needs to verify complex equations and edge cases in under 3 seconds without hunting through 30-page documents.
- **Marcus (Equity Research Associate):** Analyzes 10-Ks, earnings call transcripts, and analyst updates on desktop and mobile. Requires bulletproof citation integrity before quoting numbers in investment memos.
- **Dev (Technical Product Manager):** Synthesizes user interview subtitle files (`.srt`), competitor pricing sheets, and engineering specs. Demands strict isolation between project materials with zero cross-contamination.

### Core Jobs-to-be-Done (JTBD)
- **JTBD-1 (Multi-Modal Synthesis):** When investigating a technical topic across PDFs, videos, and articles, I want to query them together so I can synthesize findings without managing 20 open browser tabs.
- **JTBD-2 (Instant Auditability):** When an AI makes a claim, I want to click the citation pill and see the highlighted proof in its native surrounding context within 250ms, so I can trust and verify every sentence.
- **JTBD-3 (Honest Gaps & Guided Fallback):** When my uploaded notes lack an answer, I want the system to state the gap plainly and let me approve a live web query, rather than silently making up information.

---

## 6. Success Criteria & Target Metrics

| Metric Category | Target Key Result | Measurement Method |
|---|---|---|
| **Citation Grounding Rate** | ≥ 90% of factual assistant answers include verified, clickable citation pills. | Automated eval suite on test query sets. |
| **Verification Latency** | Time-to-Showcase highlight < 250ms upon citation pill click. | Browser performance profiler telemetry. |
| **Ingestion Transparency** | 100% of ingestion errors (e.g. uncaptioned video, HTTP 403) surface immediate diagnostic tooltips. | Error injection test coverage. |
| **Interaction Velocity** | Time-to-First-Token (TTFT) for streaming answers < 1,200ms. | Server-Sent Events (SSE) telemetry. |
| **Accessibility Compliance** | 100% WCAG 2.2 Level AA compliance (4.5:1 contrast, keyboard traps eliminated). | Automated axe-core audits & screen reader pass. |

---

## 7. Scope & Boundaries

### Included in v1 Scope
- **Multi-Modal Ingestion:** Direct text/markdown, public web URLs, multi-page PDFs (≤10MB), `.srt`/`.vtt` transcript files (≤5MB), and captioned YouTube video URLs.
- **Synchronized Tri-Pane Workspace:** Left pane for Source inventory; Center pane for Grounded Chat; Right pane for Original View Showcase.
- **Deep Verification Engine:** PDF.js canvas with bounding box overlays; synchronized YouTube iframe with autoscrolling dialogue; clean web reader.
- **Honest Refusal & Web Search:** Refusal card with approval-gated web search fallback.
- **Tactile Neo-Brutalist Design System:** Complete CSS tokens, slanted interactive buttons, solid offset shadows, high-contrast focus rings, and dark mode.
- **Mobile Responsive Tab Bar:** Single-surface tabbed interface (`Sources` | `Chat` | `Showcase`) with sticky `← Back to Chat` floating action button.

### Explicit Non-Goals (v1)
- **Raw Audio Speech-to-Text:** No built-in Whisper transcription for uncaptioned `.mp3`/`.wav` files (user must supply subtitle files or captioned YouTube links).
- **Multi-User Real-Time Collaboration:** Single-user per notebook; no simultaneous collaborative editing or shared cursors in v1.
- **Native App Store Binaries:** Delivered exclusively as an ultra-responsive Progressive Web App (PWA).
- **Synthetic Audio Overviews:** No dual-host AI podcast generation; focus remains 100% on visual, audit-ready verification.

---

## 8. Multi-Year Strategic Vision

- **Phase 1 (Current Target):** The definitive personal verification workbench. Establish the benchmark for zero-hallucination grounded research and instantaneous citation inspection across desktop and mobile.
- **Phase 2 (Collaborative Knowledge Hubs):** Team workspaces with role-based notebook sharing, shared citation highlights, and export integrations directly into Obsidian, Notion, and GitHub PR descriptions.
- **Phase 3 (Active Evidence Synthesis):** Proactive discrepancy detection across conflicting sources (e.g. flagging where an earnings call transcript contradicts the audited 10-K filing) and automated synthesis briefs.
