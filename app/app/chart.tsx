"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
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

type ChartData = {
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

type ScatterDataPoint = {
  x: number;
  y: number;
  runtime: string;
  packageType: string;
  configuration: string;
  architecture: Architecture;
  memorySize: MemorySize;
  packageSize: number;
  initDuration: number;
  executionsCount: number;
};

const runtimeColors: Record<string, string> = {
  dotnet8: "hsl(var(--chart-1))",
  dotnet8_aot_al2023: "hsl(var(--chart-2))",
  dotnet9_aot_al2023: "hsl(var(--chart-3))",
  llrt: "hsl(var(--chart-4))",
  nodejs22: "hsl(var(--chart-5))",
};

const renderScatterShape = (props: unknown) => {
  const { cx, cy, fill, payload } = props as {
    cx: number;
    cy: number;
    fill: string;
    payload: ScatterDataPoint;
  };
  const size = 8;

  if (payload.packageType === "zip") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={1}
      />
    );
  } else {
    const halfSize = size;
    return (
      <rect
        x={cx - halfSize / 2}
        y={cy - halfSize / 2}
        width={halfSize}
        height={halfSize}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={1}
      />
    );
  }
};

function PackageSizeColdStartChart({ chartData }: { chartData: ChartData[] }) {
  const scatterData = chartData
    .filter((d) => d.packageSize !== undefined && d.packageSize > 0)
    .map((d) => ({
      x: (d.packageSize ?? 0) / (1024 * 1024),
      y: d.initDuration,
      runtime: d.runtime,
      packageType: d.packageType,
      configuration: d.configuration,
      architecture: d.architecture,
      memorySize: d.memorySize,
      packageSize: d.packageSize ?? 0,
      initDuration: d.initDuration,
      executionsCount: d.executionsCount,
    }));

  const runtimes = Array.from(new Set(scatterData.map((d) => d.runtime)));

  const scatterChartConfig = {
    packageSize: {
      label: "Package Size (MB)",
    },
    coldStart: {
      label: "Cold Start Duration (ms)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Package Size vs Cold Start Duration</CardTitle>
        <CardDescription>
          Relationship between package size and cold start time across different
          runtimes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={scatterChartConfig}
          className="h-[500px] w-full"
        >
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="x"
              name="Package Size"
              unit=" MB"
              label={{
                value: "Package Size (MB)",
                position: "insideBottom",
                offset: -10,
              }}
              className="text-xs"
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Cold Start"
              unit=" ms"
              label={{
                value: "Cold Start Duration (ms)",
                angle: -90,
                position: "insideLeft",
              }}
              className="text-xs"
            />
            <ZAxis range={[100, 100]} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ScatterDataPoint;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] font-semibold">
                            {data.runtime}
                          </span>
                          <span className="text-[0.70rem] text-muted-foreground">
                            {data.configuration}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Type: {data.packageType}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Size: {data.x.toFixed(2)} MB
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Cold Start: {data.y.toFixed(1)} ms
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Executions: {data.executionsCount}
                          </div>
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
              content={() => (
                <div className="flex flex-wrap gap-4 justify-center text-xs">
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold">Runtimes:</span>
                    <div className="flex flex-wrap gap-3">
                      {runtimes.map((runtime) => (
                        <div key={runtime} className="flex items-center gap-1">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: runtimeColors[runtime] }}
                          />
                          <span>{runtime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold">Package Types:</span>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                        <span>zip</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-muted-foreground" />
                        <span>image</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            />
            {runtimes.map((runtime) => (
              <Scatter
                key={runtime}
                name={runtime}
                data={scatterData.filter((d) => d.runtime === runtime)}
                fill={runtimeColors[runtime]}
                shape={renderScatterShape}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

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
      runtime: analysis.runtime,
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
    <>
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
      <PackageSizeColdStartChart chartData={chartData} />
    </>
  );
}
