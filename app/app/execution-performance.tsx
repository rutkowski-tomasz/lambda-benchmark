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
import type { Architecture, ExecutionGroup, MemorySize } from "./types";

export function ExecutionPerformance({ executionGroups, packageSizes }: { executionGroups: ExecutionGroup[], packageSizes: Record<string, number> }) {
  const chartData = executionGroups
    .map((analysis) => {
      const avgDuration =
        analysis.executions.reduce((acc, curr) => acc + curr.duration, 0) /
        analysis.executions.length;
      const avgInitDuration =
        analysis.executions.reduce((acc, curr) => acc + curr.initDuration, 0) /
        analysis.executions.length;
      const avgBilledDuration =
        analysis.executions.reduce(
          (acc, curr) => acc + curr.billedDuration,
          0
        ) / analysis.executions.length;
      const avgMemoryUsed =
        analysis.executions.reduce((acc, curr) => acc + curr.memoryUsed, 0) /
        analysis.executions.length;
      const packageSize = packageSizes[`${analysis.runtime}-${analysis.packageType}-${analysis.architecture}`];

      return {
        configuration: `${analysis.runtime} ${analysis.architecture} ${analysis.memorySize}MB`,
        runtime: analysis.runtime,
        packageType: analysis.packageType,
        architecture: analysis.architecture,
        memorySize: analysis.memorySize,
        duration: avgDuration,
        initDuration: avgInitDuration,
        billedDuration: avgBilledDuration,
        packageSize,
        memoryUsed: avgMemoryUsed,
        executionsCount: analysis.executions.length,
      };
    })
    .sort((a, b) => a.configuration.localeCompare(b.configuration));

  const chartConfig = {
    duration: {
      label: "Avg Duration (ms)",
      color: "hsl(var(--chart-1))",
    },
    initDuration: {
      label: "Avg Init Duration (ms)",
      color: "hsl(var(--chart-2))",
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
  ) =>
    (billedDuration / 1000) * (memorySize / 1024) * pricePerGbs[architecture];

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
                if (active && payload?.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          {label}
                        </span>
                        <div className="grid gap-1">
                          <div className="text-[0.70rem]">
                            Executions: {data.executionsCount}
                          </div>
                          <div className="text-[0.70rem]">
                            Package Size: {formatSize(data.packageSize)}
                          </div>
                          <div className="text-[0.70rem]">
                            Memory Used: {data.memoryUsed.toFixed(1)} MB
                          </div>
                          <div className="text-[0.70rem]">
                            Package Type: {data.packageType}
                          </div>
                          <div className="text-[0.70rem]">
                            Avg Billed Duration:{" "}
                            {data.billedDuration.toFixed(1)} ms
                          </div>
                          <div className="text-[0.70rem]">
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
