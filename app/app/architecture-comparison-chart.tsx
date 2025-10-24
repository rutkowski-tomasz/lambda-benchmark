"use client";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
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
import type { Benchmark, ExecutionData } from "./types";

type ArchitectureChartData = {
  runtime: string;
  arm64: number;
  x86_64: number;
};

export function ArchitectureComparisonChart({
  benchmark,
}: {
  benchmark: Benchmark;
}) {
  // Group data by runtime and architecture
  const runtimeData = new Map<string, { arm64: number[]; x86_64: number[] }>();

  for (const analysis of benchmark.analysis) {
    if (!runtimeData.has(analysis.runtime)) {
      runtimeData.set(analysis.runtime, { arm64: [], x86_64: [] });
    }

    const avgDuration =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.duration,
        0
      ) / analysis.executions.length;

    const data = runtimeData.get(analysis.runtime);
    if (data) {
      data[analysis.architecture].push(avgDuration);
    }
  }

  // Calculate averages for each runtime and architecture
  const chartData: ArchitectureChartData[] = [];
  for (const [runtime, data] of runtimeData.entries()) {
    const arm64Avg =
      data.arm64.length > 0
        ? data.arm64.reduce((a, b) => a + b, 0) / data.arm64.length
        : 0;
    const x86_64Avg =
      data.x86_64.length > 0
        ? data.x86_64.reduce((a, b) => a + b, 0) / data.x86_64.length
        : 0;

    chartData.push({
      runtime,
      arm64: arm64Avg,
      x86_64: x86_64Avg,
    });
  }

  // Sort by runtime name
  chartData.sort((a, b) => a.runtime.localeCompare(b.runtime));

  const chartConfig = {
    arm64: {
      label: "ARM64",
      color: "hsl(var(--chart-1))",
    },
    x86_64: {
      label: "x86_64",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ARM64 versus x86_64 Performance</CardTitle>
        <CardDescription>
          Average execution duration comparison by architecture
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
              dataKey="runtime"
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
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          {payload.map((entry, index) => (
                            <div
                              key={`item-${
                                // biome-ignore lint/suspicious/noArrayIndexKey: using index as key is safe here
                                index
                              }`}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-[0.70rem]">
                                {entry.name === "arm64" ? "ARM64" : "x86_64"}:{" "}
                                {Number(entry.value).toFixed(2)} ms
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
              formatter={(value) => (value === "arm64" ? "ARM64" : "x86_64")}
            />
            <Bar dataKey="arm64" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="x86_64" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
