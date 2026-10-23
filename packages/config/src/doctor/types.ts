/**
 * Types for Developer Diagnostic Doctor Suite
 * Grounding: _documentation/planning/architecture/05-m1-developer-golden-path-and-auth.md §3.5
 */

export type DoctorStatus = "PASS" | "FAIL" | "WARN";

export interface DoctorLayerResult {
  readonly layer: number;
  readonly name: string;
  readonly status: DoctorStatus;
  readonly message: string;
  readonly durationMs: number;
  readonly suggestion?: string;
}

export interface DoctorReport {
  readonly overallStatus: DoctorStatus;
  readonly totalDurationMs: number;
  readonly layers: readonly DoctorLayerResult[];
}

export type DiagnosticProbe = () => Promise<DoctorLayerResult> | DoctorLayerResult;
