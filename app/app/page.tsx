import fs from "node:fs";
import path from "node:path";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExecutionPerformance } from "./execution-performance";
import { PackageSizeAnalysis } from "./package-size-analysis";
import type { Benchmark } from "./types";

export default function Home() {
  const benchmark: Benchmark = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "../data/benchmark.json"), "utf8")
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Lambda Benchmark
          </h1>
          <ThemeToggle />
        </div>
        <div className="space-y-6">
          <ExecutionPerformance benchmark={benchmark} />
          <PackageSizeAnalysis benchmark={benchmark} />
        </div>
      </div>
    </div>
  );
}
