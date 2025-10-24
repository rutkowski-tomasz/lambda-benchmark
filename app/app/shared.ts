import type {
  Architecture,
  Benchmark,
  ExecutionData,
  MemorySize,
} from "./types";

export type AnalysisData = {
  packageType: string;
  architecture: Architecture;
  memorySize: MemorySize;
  configuration: string;
  runtime: string;
  duration: number;
  initDuration: number;
  billedDuration: number;
  packageSize: number | undefined;
  memoryUsed: number;
  executionsCount: number;
};

export const prepareAnalysisData = (benchmark: Benchmark): AnalysisData[] => {
  const data: AnalysisData[] = [];

  for (const analysis of benchmark.analysis) {
    const executions = analysis.executions;
    const count = executions.length;

    const avgDuration =
      executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.duration,
        0
      ) / count;
    const avgInitDuration =
      executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.initDuration,
        0
      ) / count;
    const avgBilledDuration =
      executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.billedDuration,
        0
      ) / count;
    const avgMemoryUsed =
      executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.memoryUsed,
        0
      ) / count;

    const packageSize = benchmark.packageSizes.find(
      (x) =>
        x.runtime === analysis.runtime &&
        x.architecture === analysis.architecture &&
        x.packageType === analysis.packageType
    )?.size;

    data.push({
      packageType: analysis.packageType,
      architecture: analysis.architecture,
      memorySize: analysis.memorySize,
      runtime: analysis.runtime,
      configuration: `${analysis.runtime} ${analysis.architecture} ${analysis.memorySize}MB`,
      duration: avgDuration,
      initDuration: avgInitDuration,
      billedDuration: avgBilledDuration,
      packageSize,
      memoryUsed: avgMemoryUsed,
      executionsCount: count,
    });
  }

  return data.sort((a, b) => a.configuration.localeCompare(b.configuration));
};

export const runtimeColors: Record<string, string> = {
  dotnet8: "hsl(var(--chart-1))",
  dotnet8_aot_al2023: "hsl(var(--chart-2))",
  dotnet9_aot_al2023: "hsl(var(--chart-3))",
  llrt: "hsl(var(--chart-4))",
  nodejs22: "hsl(var(--chart-5))",
};
