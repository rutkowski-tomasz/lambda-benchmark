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
  const architectureSet = new Set<Architecture>();
  const memorySizeSet = new Set<MemorySize>();

  for (const analysis of benchmark.analysis) {
    runtimeSet.add(analysis.runtime);
    architectureSet.add(analysis.architecture);
    memorySizeSet.add(analysis.memorySize);

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

  // Sort and convert to arrays
  const runtimes = Array.from(runtimeSet).sort();
  const architectures = Array.from(architectureSet).sort();
  const memorySizes = Array.from(memorySizeSet).sort((a, b) => a - b);

  // State for selected filters (all selected by default)
  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<string>>(
    () => new Set(runtimes)
  );
  const [selectedArchitectures, setSelectedArchitectures] = useState<
    Set<Architecture>
  >(() => new Set(architectures));
  const [selectedMemorySizes, setSelectedMemorySizes] = useState<
    Set<MemorySize>
  >(() => new Set(memorySizes));
  const [isRuntimeDropdownOpen, setIsRuntimeDropdownOpen] = useState(false);
  const [isArchitectureDropdownOpen, setIsArchitectureDropdownOpen] =
    useState(false);
  const [isMemorySizeDropdownOpen, setIsMemorySizeDropdownOpen] =
    useState(false);
  const runtimeDropdownRef = useRef<HTMLDivElement>(null);
  const architectureDropdownRef = useRef<HTMLDivElement>(null);
  const memorySizeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        runtimeDropdownRef.current &&
        !runtimeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRuntimeDropdownOpen(false);
      }
      if (
        architectureDropdownRef.current &&
        !architectureDropdownRef.current.contains(event.target as Node)
      ) {
        setIsArchitectureDropdownOpen(false);
      }
      if (
        memorySizeDropdownRef.current &&
        !memorySizeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMemorySizeDropdownOpen(false);
      }
    };

    if (
      isRuntimeDropdownOpen ||
      isArchitectureDropdownOpen ||
      isMemorySizeDropdownOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [
    isRuntimeDropdownOpen,
    isArchitectureDropdownOpen,
    isMemorySizeDropdownOpen,
  ]);

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

  // Filter data based on all selections
  const filteredData = scatterData.filter(
    (d) =>
      selectedRuntimes.has(d.runtime) &&
      selectedArchitectures.has(d.architecture) &&
      selectedMemorySizes.has(d.memorySize)
  );

  // Get unique runtimes from filtered data for chart rendering
  const visibleRuntimes = Array.from(
    new Set(filteredData.map((d) => d.runtime))
  ).sort();

  const toggleRuntime = (runtime: string) => {
    const newSelected = new Set(selectedRuntimes);
    if (newSelected.has(runtime)) {
      newSelected.delete(runtime);
    } else {
      newSelected.add(runtime);
    }
    setSelectedRuntimes(newSelected);
  };

  const toggleArchitecture = (architecture: Architecture) => {
    const newSelected = new Set(selectedArchitectures);
    if (newSelected.has(architecture)) {
      newSelected.delete(architecture);
    } else {
      newSelected.add(architecture);
    }
    setSelectedArchitectures(newSelected);
  };

  const toggleMemorySize = (memorySize: MemorySize) => {
    const newSelected = new Set(selectedMemorySizes);
    if (newSelected.has(memorySize)) {
      newSelected.delete(memorySize);
    } else {
      newSelected.add(memorySize);
    }
    setSelectedMemorySizes(newSelected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost vs Duration Analysis</CardTitle>
        <CardDescription>
          Cost per million requests vs average duration by runtime
        </CardDescription>
        <CardAction>
          <div className="flex gap-2">
            {/* Runtime Filter */}
            <div className="relative" ref={runtimeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRuntimeDropdownOpen(!isRuntimeDropdownOpen)}
                className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {selectedRuntimes.size}/{runtimes.length} runtimes
                <ChevronDown className="h-4 w-4" />
              </button>
              {isRuntimeDropdownOpen && (
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

            {/* Architecture Filter */}
            <div className="relative" ref={architectureDropdownRef}>
              <button
                type="button"
                onClick={() =>
                  setIsArchitectureDropdownOpen(!isArchitectureDropdownOpen)
                }
                className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {selectedArchitectures.size}/{architectures.length} arch
                <ChevronDown className="h-4 w-4" />
              </button>
              {isArchitectureDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-background shadow-lg">
                  <div className="max-h-80 overflow-y-auto p-2">
                    {architectures.map((architecture) => (
                      <label
                        key={architecture}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selectedArchitectures.has(architecture)}
                          onChange={() => toggleArchitecture(architecture)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>{architecture}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Memory Size Filter */}
            <div className="relative" ref={memorySizeDropdownRef}>
              <button
                type="button"
                onClick={() =>
                  setIsMemorySizeDropdownOpen(!isMemorySizeDropdownOpen)
                }
                className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {selectedMemorySizes.size}/{memorySizes.length} memory
                <ChevronDown className="h-4 w-4" />
              </button>
              {isMemorySizeDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border bg-background shadow-lg">
                  <div className="max-h-80 overflow-y-auto p-2">
                    {memorySizes.map((memorySize) => (
                      <label
                        key={memorySize}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMemorySizes.has(memorySize)}
                          onChange={() => toggleMemorySize(memorySize)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>{memorySize} MB</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ScatterChart margin={{ top: 20, right: 30, left: 30, bottom: 80 }}>
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
              name="Cost per 1M"
              unit=" $"
              type="number"
              label={{
                value: "Cost per 1M Requests ($)",
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
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: "20px" }}
            />
            {visibleRuntimes.map((runtime) => (
              <Scatter
                key={runtime}
                name={runtime}
                data={filteredData.filter((d) => d.runtime === runtime)}
                fill={chartConfig[runtime].color}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
