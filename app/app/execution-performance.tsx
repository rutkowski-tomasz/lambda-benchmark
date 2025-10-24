"use client";
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
import { prepareAnalysisData } from "./shared";
import type { Architecture, Benchmark, MemorySize } from "./types";

const chartConfig = {
  duration: { label: "Avg Duration (ms)", color: "hsl(var(--chart-1))" },
  initDuration: {
    label: "Avg Init Duration (ms)",
    color: "hsl(var(--chart-2))",
  },
  packageSize: { label: "Package Size (MB)", color: "hsl(var(--chart-3))" },
  memoryUsed: { label: "Avg Memory Used (MB)", color: "hsl(var(--chart-4))" },
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

export function ExecutionPerformance({ benchmark }: { benchmark: Benchmark }) {
  const data = prepareAnalysisData(benchmark);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lambda Execution Performance</CardTitle>
        <CardDescription>
          Average execution duration by configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart
            data={data}
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
                  const d = payload[0].payload;
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
                            Executions: {d.executionsCount}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Size: {formatSize(d.packageSize)}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Memory Used: {d.memoryUsed.toFixed(1)} MB
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Type: {d.packageType}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Avg Billed Duration: {d.billedDuration.toFixed(1)}{" "}
                            ms
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Avg 1M invocations cost: $
                            {(
                              calculateCost(
                                d.billedDuration,
                                d.memorySize,
                                d.architecture
                              ) * 1_000_000
                            ).toFixed(2)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
                            <span className="text-[0.70rem]">
                              Duration: {d.duration.toFixed(1)} ms
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />
                            <span className="text-[0.70rem]">
                              Init Duration: {d.initDuration.toFixed(1)} ms
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
