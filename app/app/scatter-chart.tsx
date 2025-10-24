"use client";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardAction,
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

type ScatterDataPoint = {
  runtime: string;
  configuration: string;
  avgDuration: number;
  costPerMillion: number;
  architecture: Architecture;
  memorySize: MemorySize;
  packageType: string;
  packageSize: number | undefined;
  memoryUsed: number;
  billedDuration: number;
  executionsCount: number;
};

export function ScatterPlotChart({ benchmark }: { benchmark: Benchmark }) {
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

  // Transform data for scatter plot
  const scatterData: ScatterDataPoint[] = [];
  const runtimeSet = new Set<string>();

  for (const analysis of benchmark.analysis) {
    runtimeSet.add(analysis.runtime);

    const avgDuration =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.duration,
        0
      ) / analysis.executions.length;

    const avgBilledDuration =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.billedDuration,
        0
      ) / analysis.executions.length;

    const avgMemoryUsed =
      analysis.executions.reduce(
        (acc: number, curr: ExecutionData) => acc + curr.memoryUsed,
        0
      ) / analysis.executions.length;

    const packageSize = benchmark.packageSizes.find(
      (x) =>
        x.runtime === analysis.runtime &&
        x.architecture === analysis.architecture &&
        x.packageType === analysis.packageType
    )?.size;

    const costPerMillion =
      calculateCost(
        avgBilledDuration,
        analysis.memorySize,
        analysis.architecture
      ) * 1_000_000;

    scatterData.push({
      runtime: analysis.runtime,
      configuration: `${analysis.runtime} ${analysis.architecture} ${analysis.memorySize}MB`,
      avgDuration,
      costPerMillion,
      architecture: analysis.architecture,
      memorySize: analysis.memorySize,
      packageType: analysis.packageType,
      packageSize,
      memoryUsed: avgMemoryUsed,
      billedDuration: avgBilledDuration,
      executionsCount: analysis.executions.length,
    });
  }

  // Sort runtimes alphabetically for consistent color assignment
  const runtimes = Array.from(runtimeSet).sort();

  // State for selected runtimes (all selected by default)
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<string>>(
    () => new Set(runtimes)
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  // Generate chart config with colors for each runtime
  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const chartConfig: ChartConfig = {};
  runtimes.forEach((runtime, index) => {
    chartConfig[runtime] = {
      label: runtime,
      color: chartColors[index % chartColors.length],
    };
  });

  // Filter runtimes based on selection
  const visibleRuntimes = runtimes.filter((runtime) =>
    selectedRuntimes.has(runtime)
  );

  const toggleRuntime = (runtime: string) => {
    const newSelected = new Set(selectedRuntimes);
    if (newSelected.has(runtime)) {
      newSelected.delete(runtime);
    } else {
      newSelected.add(runtime);
    }
    setSelectedRuntimes(newSelected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost vs Duration Analysis</CardTitle>
        <CardDescription>
          Cost per million requests vs average duration by runtime
        </CardDescription>
        <CardAction>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {selectedRuntimes.size} of {runtimes.length} runtimes selected
              <ChevronDown className="h-4 w-4" />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-background shadow-lg">
                <div className="max-h-80 overflow-y-auto p-2">
                  {runtimes.map((runtime) => (
                    <label
                      key={runtime}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRuntimes.has(runtime)}
                        onChange={() => toggleRuntime(runtime)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div
                        className="h-3 w-3 rounded-sm"
                        style={{
                          backgroundColor: chartConfig[runtime].color,
                        }}
                      />
                      <span>{runtime}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="avgDuration"
              name="Average Duration"
              unit=" ms"
              type="number"
              label={{
                value: "Average Duration (ms)",
                position: "insideBottom",
                offset: 0,
              }}
              className="text-xs"
            />
            <YAxis
              dataKey="costPerMillion"
              name="Cost per Million"
              unit=" $"
              type="number"
              label={{
                value: "Cost per Million Requests ($)",
                angle: -90,
                position: "insideLeft",
              }}
              className="text-xs"
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ScatterDataPoint;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] font-semibold">
                            {data.configuration}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Runtime: {data.runtime}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Executions: {data.executionsCount}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Size:{" "}
                            {data.packageSize !== undefined
                              ? formatSize(data.packageSize)
                              : "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Memory Used: {data.memoryUsed.toFixed(1)} MB
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Package Type: {data.packageType}
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Avg Duration: {data.avgDuration.toFixed(1)} ms
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Avg Billed Duration:{" "}
                            {data.billedDuration.toFixed(1)} ms
                          </div>
                          <div className="flex items-center gap-2 text-[0.70rem]">
                            Cost per 1M requests: $
                            {data.costPerMillion.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            {visibleRuntimes.map((runtime) => (
              <Scatter
                key={runtime}
                name={runtime}
                data={scatterData.filter((d) => d.runtime === runtime)}
                fill={chartConfig[runtime].color}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
