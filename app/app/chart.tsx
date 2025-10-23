"use client";
import dynamic from "next/dynamic";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { formatSize } from "@/lib/utils";
import type {
  Architecture,
  Benchmark,
  ExecutionData,
  MemorySize,
} from "./types";

const ThemeToggle = dynamic(
  () => import("@/components/theme-toggle").then((mod) => ({ default: mod.ThemeToggle })),
  { ssr: false }
);

type ChartData = {
  packageType: string;
  architecture: Architecture;
  memorySize: MemorySize;
  configuration: string;
  duration: number;
  initDuration: number;
  billedDuration: number;
  packageSize: number | undefined;
  memoryUsed: number;
  executionsCount: number;
};

export function Chart({ benchmark }: { benchmark: Benchmark }) {
  const chartData: ChartData[] = [];
  for (const analysis of benchmark.analysis) {
    const avgDuration =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.duration,
        0
      ) / analysis.executions.length;

    const avgInitDuration =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.initDuration,
        0
      ) / analysis.executions.length;

    const avgBilledDuration =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.billedDuration,
        0
      ) / analysis.executions.length;

    const packageSize = benchmark.packageSizes.find(
      (x) =>
        x.runtime === analysis.runtime &&
        x.architecture === analysis.architecture &&
        x.packageType === analysis.packageType
    )?.size;
    const avgMemoryUsed =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.memoryUsed,
        0
      ) / analysis.executions.length;
    chartData.push({
      packageType: analysis.packageType,
      architecture: analysis.architecture,
      memorySize: analysis.memorySize,
      configuration: `${analysis.runtime} ${analysis.architecture} ${analysis.memorySize}MB`,
      duration: avgDuration,
      initDuration: avgInitDuration,
      billedDuration: avgBilledDuration,
      packageSize: packageSize,
      memoryUsed: avgMemoryUsed,
      executionsCount: analysis.executions.length,
    });
  }
  chartData.sort((a: ChartData, b: ChartData) =>
    a.configuration.localeCompare(b.configuration)
  );

  const chartConfig = {
    duration: {
      label: "Avg Duration (ms)",
      color: "hsl(var(--chart-1))",
    },
    initDuration: {
      label: "Avg Init Duration (ms)",
      color: "hsl(var(--chart-2))",
    },
    packageSize: {
      label: "Package Size (MB)",
      color: "hsl(var(--chart-3))",
    },
    memoryUsed: {
      label: "Avg Memory Used (MB)",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  const pricePerGbs: Record<Architecture, number> = {
    arm64: 0.0000133334,
    x86_64: 0.0000166667,
  };
  const calculateCost = (
    billedDuration: number,
    memorySize: MemorySize,
    architecture: Architecture
  ) => {
    return (
      (billedDuration / 1000) * (memorySize / 1024) * pricePerGbs[architecture]
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Lambda Execution Performance</CardTitle>
            <CardDescription>
              Average execution duration by configuration
            </CardDescription>
          </div>
          <ThemeToggle />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="configuration"
              angle={-45}
              textAnchor="end"
              height={100}
              className="text-xs"
            />
            <YAxis
              label={{
                value: "Duration (ms)",
                angle: -90,
                position: "insideLeft",
              }}
              className="text-xs"
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Executions: {data.executionsCount}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Size: {formatSize(data.packageSize)}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Memory Used: {data.memoryUsed.toFixed(1)} MB
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Type: {data.packageType}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Avg Billed Duration:{" "}
                            {data.billedDuration.toFixed(1)} ms
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Avg 1M invocations cost: $
                            {(
                              calculateCost(
                                data.billedDuration,
                                data.memorySize,
                                data.architecture
                              ) * 1_000_000
                            ).toFixed(2)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
                            <span className="text-[0.70rem]">
                              Duration: {data.duration.toFixed(1)} ms
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />
                            <span className="text-[0.70rem]">
                              Init Duration: {data.initDuration.toFixed(1)} ms
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="duration"
              fill="var(--chart-1)"
              stackId="totalDuration"
            />
            <Bar
              dataKey="initDuration"
              fill="var(--chart-2)"
              radius={[8, 8, 0, 0]}
              stackId="totalDuration"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
