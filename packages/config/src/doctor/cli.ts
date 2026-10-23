#!/usr/bin/env bun
import { runDoctor } from "./index.js";

async function main() {
  console.log("\n🩺 Contextual AI Platform — Developer Golden Path Diagnostic (dev:doctor)");
  console.log("=======================================================================\n");

  const report = await runDoctor();

  for (const layer of report.layers) {
    const symbol = layer.status === "PASS" ? "✅" : layer.status === "WARN" ? "⚠️ " : "❌";
    console.log(`${symbol} Layer ${layer.layer}: ${layer.name} (${layer.durationMs}ms)`);
    console.log(`   ${layer.message}`);
    if (layer.suggestion) {
      console.log(`   💡 Tip: ${layer.suggestion}`);
    }
    console.log("");
  }

  console.log("-----------------------------------------------------------------------");
  console.log(`Diagnostic Complete in ${report.totalDurationMs}ms | Status: ${report.overallStatus}\n`);

  if (report.overallStatus === "FAIL") {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Diagnostic probe failed fatally:", err);
  process.exit(1);
});
