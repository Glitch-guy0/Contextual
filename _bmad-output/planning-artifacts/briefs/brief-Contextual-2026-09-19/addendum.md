# Contextual Product Brief — Technical & UX Addendum

**Target Deliverable:** Supplementary reference for downstream artifacts (PRD, Architecture, UX Design System)  
**Parent Document:** [Product Brief: Contextual](file:///Users/prajwal/Documents/learning/Contextual/_bmad-output/planning-artifacts/briefs/brief-Contextual-2026-09-19/brief.md)  
**Author:** Mary (Business Analyst) 📊  

---

## 1. Functional Requirements Inventory (FR-1 through FR-19)

### 1.1 Multi-Modal Ingestion Engine
- **FR-1 (Direct Text Ingestion):** Ingest raw text or markdown (min 50 chars, max 500,000 chars / ~500KB). Retains code blocks, headers, bullet lists. Metadata: `{ sourceName: string }`.
- **FR-2 (Web URL Ingestion):** Clean article markdown extraction from HTTP/HTTPS URLs. Blocks localhost, private subnets (RFC 1918). Paywall / HTTP 403 / 404 flagged with explicit error status. Metadata: `{ sourceName: string, link: string }`.
- **FR-3 (PDF Document Ingestion):** Supports PDF files ≤ 10MB. Page-by-page text parsing with sequential page numbers and paragraph chunking. Metadata: `{ sourceName: string, pageNumber: number }`.
- **FR-4 (Subtitle & Transcript Ingestion):** Supports `.srt` and `.vtt` files ≤ 5MB. Normalizes dialogue turns with playback timecodes (`hh:mm:ss.ms`). Metadata: `{ sourceName: string, timestamp: string }`.
- **FR-5 (YouTube Video Ingestion):** Parses standard and shortened YouTube URLs. Fetches existing subtitles/captions without requiring external API keys. If captions are missing or disabled, fails immediately with diagnostic: *"No captions or transcript available for this YouTube video. Try uploading an .srt transcript file."* Raw audio transcription is out of scope. Metadata: `{ sourceName: string, timestamp: string, link: string }`.
- **FR-6 (Source State Machine):** 4 distinct states:
  - `queued`: Gray border, static gray dot.
  - `indexing`: Brand yellow border, orbital shadow spin indicator.
  - `ready`: Solid ink border, green pulse dot. Emits 1-second subtle success glow.
  - `failed`: Solid red border, red alert dot, failure tooltip, single-click `[Retry]` button.
- **FR-7 (Notebook CRUD & Ceilings):** Hard limit of 10 notebooks per user. Bulk selection and cascading deletion (purges chunks, vector points, and file records).

### 1.2 Grounded Retrieval & Conversational AI
- **FR-8 (Scoped Semantic Retrieval):** Query searches exclusively within the active notebook chunks. Strict tenant and notebook ID isolation (`topK = 5`, `minScore = 0.30`).
- **FR-9 (Grounded Synthesis & Inline Citations):** Responses cite retrieved chunks using marker tags (`[[C:chunkId]]`), converted client-side into non-slanted, high-contrast cyan pills (`[1]`). Tooltips show source title and page/timestamp.
- **FR-10 (Honest Refusal & Web Search Gate):** Below threshold (0.30) or missing context produces an Honest Refusal Card: *"The uploaded sources do not contain information regarding this query."* Followed by button: `[Search Web & Answer (1 Credit)]`. Web search is strictly approval-gated.
- **FR-11 (Token Streaming & History Window):** Token-by-token SSE streaming with typing cursor. Retains a sliding history window of the last 7 conversation turns.

### 1.3 Deep Original View (Showcase) Verification
- **FR-12 (Text Showcase):** Smooth scroll to cited markdown sentence with persistent high-contrast highlight overlay.
- **FR-13 (Web Showcase):** Sanitized reader view auto-scrolled to cited passage; includes `[Open Live Page ↗]` linkout button.
- **FR-14 (PDF Showcase):** Direct jump to exact `pageNumber` with semi-transparent cyan bounding-box highlight overlay over the cited paragraph. Includes page jumper, zoom, and fullscreen controls.
- **FR-15 (YouTube / Transcript Showcase):** Embedded video player pre-configured to seek and autoplay at the cited timestamp second. Synchronized dialogue list autoscrolls with active highlight ring.

### 1.4 Governance, Storage & Observability
- **FR-16 (Daily Credit Governor):** 10 daily interaction credits on a rolling 24-hour reset. Chat query = 1 credit; approved web search = 1 credit; ingestion and source browsing = 0 credits (unlimited free). Zero credits locks composer and renders warning banner.
- **FR-17 (Storage Boundaries):** Max 10 notebooks, max 10 sources/notebook, max 30 total sources/user, max 10MB PDF, max 5MB transcript.
- **FR-18 (Ephemeral Auto-Deletion Notice):** Persistent header banner: `"⏳ Auto-deletion Notice: This notebook will be auto-deleted tonight at 12:00 AM Asia/Kolkata (UTC+05:30)."` Automated purge cleans database, vector indices, and files at midnight IST.
- **FR-19 (Bounded Telemetry):** Zero third-party analytics/trackers. Only records prompt length (characters) and file ingestion metadata (type, byte size). Never records raw prompt text or assistant answers.

---

## 2. Upgraded Modern Neo-Brutalist UX Design System

### 2.1 Color Matrix (OKLch & Hex)
- **Canvas (`--bg`):** `#F4F4F0` / `oklch(0.982 0.003 90)` (Warm industrial paper)
- **Surface (`--surface`):** `#FFFFFF` / `oklch(1 0 0)` (Pure white panels)
- **Ink / Typography (`--fg`, `--border`):** `#111111` / `oklch(0.21 0 0)` (2px solid ink)
- **Muted (`--muted`):** `#555555` / `oklch(0.44 0 0)`
- **Brand Accent (`--accent`):** `#FFE500` / `oklch(0.93 0.17 95)` (Primary action yellow)
- **Verification Cyan (`--citation`):** `#00E5FF` / `oklch(0.84 0.19 215)` (Citation pills & bounding boxes)
- **Error / Danger (`--danger`):** `#FF3333` / `oklch(0.65 0.22 27)` (Credit lock & failures)
- **Success (`--success`):** `#00E575` / `oklch(0.82 0.20 155)` (Ingestion ready)

### 2.2 Three-Voice Typography System
1. **Display Voice (`Space Mono`, Weight 700):** Brand logo, notebook titles, section headers, modal titles.
2. **Working Voice (`Inter`, Weights 400/500/600):** Long-form chat messages, reader text, form inputs (`line-height: 1.6`).
3. **Verifier / Receipt Voice (`Space Mono`, Monospace):** Citation pills (`[1]`), credit counter (`⚡ 8/10`), timestamps (`18:42`), page indicators (`Page 14 of 28`).

### 2.3 Tactile Elevation & Spacing
- **Resting:** `4px 4px 0 0 #111111`
- **Hover / Focus:** `6px 6px 0 0 #111111` with `translate(-2px, -2px)`
- **Active / Pressed:** `0 0 0 0 #111111` with `translate(4px, 4px)`
- **Modal Depth:** `8px 8px 0 0 #111111`
- **Spacing Scale:** `4px` (xs), `8px` (sm), `16px` (md), `24px` (lg), `40px` (xl)

### 2.4 Component Anatomy
- `<NeoButton>`: `transform: skewX(-6deg)`, 2px ink border, solid shadow, yellow/white/red variants.
- `<CitationPill>`: Non-slanted 11px bold monospace, `#00E5FF` background, tooltip on hover.
- `<SourceCard>`: 2px border, 4px shadow, status indicator, action menu.
- `<RefusalCard>`: In-stream warning border, refusal text, slanted fallback CTA.
- `<MobileBackToChat>`: Fixed bottom floating action button on mobile Showcase view.

---

## 3. Keyboard Ergonomics & Accessibility Floor
- `⌘K` / `Ctrl+K`: Global notebook switcher.
- `/`: Quick-focus chat composer.
- `Enter`: Submit chat prompt.
- `Shift + Enter`: Insert newline.
- `[` / `]`: Previous / Next page in PDF Showcase.
- `Esc`: Close modal or slide-over drawer.
- High-contrast `:focus-visible` ring: `3px solid #00E5FF` with 2px offset.
- `prefers-reduced-motion`: Collapses button skews to `0`, replaces elevation lifts with 3px static ink underlines.
