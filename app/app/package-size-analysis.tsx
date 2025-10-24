"use client";
import {
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
import {
  type AnalysisData,
  prepareAnalysisData,
  runtimeColors,
} from "./shared";
import type { Benchmark } from "./types";

type ScatterPoint = {
  x: number;
  y: number;
  runtime: string;
  packageType: string;
  configuration: string;
  executionsCount: number;
};

const renderShape = (props: unknown) => {
  const { cx, cy, fill, payload } = props as {
    cx: number;
    cy: number;
    fill: string;
    payload: ScatterPoint;
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
  }

  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill={fill}
      stroke="hsl(var(--background))"
      strokeWidth={1}
    />
  );
};

const transformData = (data: AnalysisData[]): ScatterPoint[] =>
  data
    .filter((d) => d.packageSize !== undefined && d.packageSize > 0)
    .map((d) => ({
      x: (d.packageSize ?? 0) / (1024 * 1024),
      y: d.initDuration,
      runtime: d.runtime,
      packageType: d.packageType,
      configuration: d.configuration,
      executionsCount: d.executionsCount,
    }));

const chartConfig = {
  packageSize: { label: "Package Size (MB)" },
  coldStart: { label: "Cold Start Duration (ms)" },
} satisfies ChartConfig;

export function PackageSizeAnalysis({ benchmark }: { benchmark: Benchmark }) {
  const data = transformData(prepareAnalysisData(benchmark));
  const runtimes = Array.from(new Set(data.map((d) => d.runtime)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Package Size vs Cold Start Duration</CardTitle>
        <CardDescription>
          Relationship between package size and cold start time across different
          runtimes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[500px] w-full">
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
                  const d = payload[0].payload as ScatterPoint;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] font-semibold">
                            {d.runtime}
                          </span>
                          <span className="text-[0.70rem] text-muted-foreground">
                            {d.configuration}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Type: {d.packageType}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Size: {d.x.toFixed(2)} MB
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Cold Start: {d.y.toFixed(1)} ms
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Executions: {d.executionsCount}
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
                data={data.filter((d) => d.runtime === runtime)}
                fill={runtimeColors[runtime]}
                shape={renderShape}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
