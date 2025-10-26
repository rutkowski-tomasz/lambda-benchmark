import fs from "node:fs";
import path from "node:path";
import { ThemeToggle } from "@/components/theme-toggle";
import { CostAnalysis } from "./cost-analysis";
import { ExecutionPerformance } from "./execution-performance";
import { PackageColdstartAnalysis } from "./package-coldstart-analysis";
import type { ExecutionGroup } from "./types";

export default function Home() {
  const executionGroups: ExecutionGroup[] = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "../data/benchmark.json"), "utf8")
  );

  const packageSizes: Record<string, number> = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "../data/packageSizes.json"), "utf8")
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
          <ExecutionPerformance executionGroups={executionGroups} />
          <PackageColdstartAnalysis executionGroups={executionGroups} />
          <CostAnalysis executionGroups={executionGroups} />
        </div>
      </div>
    </div>
  );
}
