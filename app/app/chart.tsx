"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatSize } from "@/lib/utils";

export function Chart({ executions }: { executions: any }) {
  const chartData = [];
  for (const execution of executions) {
    const avgDuration =
      execution.executions.reduce(
        (acc: number, curr: any) => acc + curr.duration,
        0
      ) / execution.executions.length;

    const avgInitDuration =
      execution.executions.reduce(
        (acc: number, curr: any) => acc + curr.initDuration,
        0
      ) / execution.executions.length;

    const packageSize = execution.packageSize;
    const avgMemoryUsed = execution.executions.reduce((acc: number, curr: any) => acc + curr.memoryUsed, 0) / execution.executions.length;
    chartData.push({
      packageType: execution.packageType,
      architecture: execution.architecture,
      memorySize: execution.memorySize,
      configuration: `${execution.runtime} ${execution.architecture} ${execution.memorySize}MB`,
      duration: avgDuration,
      initDuration: avgInitDuration,
      packageSize: packageSize,
      memoryUsed: avgMemoryUsed,
      executionsCount: execution.executions.length,
    });
    console.log(
      `${execution.runtime} ${execution.architecture} ${execution.memorySize}MB: ${avgDuration}`
    );
  }
  chartData.sort((a: any, b: any) => a.configuration.localeCompare(b.configuration));

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
