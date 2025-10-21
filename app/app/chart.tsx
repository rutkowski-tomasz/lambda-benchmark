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
    chartData.push({
      configuration: `${execution.runtime} ${execution.architecture} ${execution.memorySize}MB`,
      duration: avgDuration,
      initDuration: avgInitDuration,
    });
    console.log(
      `${execution.runtime} ${execution.architecture} ${execution.memorySize}MB: ${avgDuration}`
    );
  }

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
            <ChartTooltip content={<ChartTooltipContent />} />
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
