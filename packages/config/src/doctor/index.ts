import {
  probeLayer1Runtime,
  probeLayer2Docker,
  probeLayer3Environment,
  probeLayer4Database,
  probeLayer5Redis,
  probeLayer6Ports,
  probeLayer7Packages,
  probeLayer8BuildHealth,
} from "./layers.js";
import type { DoctorReport, DoctorLayerResult, DoctorStatus } from "./types.js";

export * from "./types.js";
export * from "./layers.js";

export interface RunDoctorOptions {
  projectRoot?: string;
  customEnv?: Record<string, string | undefined>;
}

export async function runDoctor(options: RunDoctorOptions = {}): Promise<DoctorReport> {
  const start = performance.now();
  const layers: DoctorLayerResult[] = [];

  // Execute all 8 diagnostic layers in sequence
  layers.push(await probeLayer1Runtime());
  layers.push(await probeLayer2Docker());
  layers.push(await probeLayer3Environment(options.customEnv));
  layers.push(await probeLayer4Database());
  layers.push(await probeLayer5Redis());
  layers.push(await probeLayer6Ports());
  layers.push(await probeLayer7Packages(options.projectRoot));
  layers.push(await probeLayer8BuildHealth(options.projectRoot));

  let overallStatus: DoctorStatus = "PASS";
  if (layers.some((l) => l.status === "FAIL")) {
    overallStatus = "FAIL";
  } else if (layers.some((l) => l.status === "WARN")) {
    overallStatus = "WARN";
  }

  return {
    overallStatus,
    totalDurationMs: Math.round(performance.now() - start),
    layers,
  };
}
