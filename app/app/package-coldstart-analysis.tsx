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
  ZAxis,
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
import type { Architecture, Benchmark, MemorySize } from "./types";

type DataPoint = {
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

const renderShape = (props: unknown) => {
  const { cx, cy, fill, payload } = props as {
    cx: number;
    cy: number;
    fill: string;
    payload: DataPoint;
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

export function PackageColdstartAnalysis({
  benchmark,
}: {
  benchmark: Benchmark;
}) {
  const data = benchmark.analysis
    .filter((a) => a.executions.length > 0)
    .map((analysis) => {
      const avgInitDuration =
        analysis.executions.reduce((acc, curr) => acc + curr.initDuration, 0) /
        analysis.executions.length;
      const packageSize = benchmark.packageSizes.find(
        (x) =>
          x.runtime === analysis.runtime &&
          x.architecture === analysis.architecture &&
          x.packageType === analysis.packageType
      )?.size;

      return {
        x: (packageSize ?? 0) / (1024 * 1024),
        y: avgInitDuration,
        runtime: analysis.runtime,
        packageType: analysis.packageType,
        configuration: `${analysis.runtime} ${analysis.architecture} ${analysis.memorySize}MB`,
        architecture: analysis.architecture,
        memorySize: analysis.memorySize,
        packageSize: packageSize ?? 0,
        initDuration: avgInitDuration,
        executionsCount: analysis.executions.length,
      };
    })
    .filter((d) => d.packageSize > 0);

  const runtimeSet = new Set<string>();
  const architectureSet = new Set<Architecture>();
  const memorySizeSet = new Set<MemorySize>();

  for (const d of data) {
    runtimeSet.add(d.runtime);
    architectureSet.add(d.architecture);
    memorySizeSet.add(d.memorySize);
  }

  const runtimes = Array.from(runtimeSet).sort();
  const architectures = Array.from(architectureSet).sort();
  const memorySizes = Array.from(memorySizeSet).sort((a, b) => a - b);

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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [
    isRuntimeDropdownOpen,
    isArchitectureDropdownOpen,
    isMemorySizeDropdownOpen,
  ]);

  const filteredData = data.filter(
    (d) =>
      selectedRuntimes.has(d.runtime) &&
      selectedArchitectures.has(d.architecture) &&
      selectedMemorySizes.has(d.memorySize)
  );

  const visibleRuntimes = Array.from(
    new Set(filteredData.map((d) => d.runtime))
  ).sort();

  const toggleSet = <T,>(set: Set<T>, value: T) => {
    const newSet = new Set(set);
    newSet.has(value) ? newSet.delete(value) : newSet.add(value);
    return newSet;
  };

  const FilterDropdown = ({
    label,
    items,
    selected,
    onToggle,
    getColor,
    dropdownRef,
    isOpen,
    setIsOpen,
  }: {
    label: string;
    items: readonly (string | number)[];
    selected: Set<string | number | Architecture | MemorySize>;
    onToggle: (value: string | number | Architecture | MemorySize) => void;
    getColor?: (item: string | number) => string | undefined;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
  }) => (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selected.size}/{items.length} {label}
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-background shadow-lg">
          <div className="max-h-80 overflow-y-auto p-2">
            {items.map((item) => (
              <label
                key={String(item)}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item as never)}
                  onChange={() => onToggle(item as never)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {getColor && (
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: getColor(item) }}
                  />
                )}
                <span>
                  {item}
                  {typeof item === "number" ? " MB" : ""}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Package Size vs Cold Start Duration</CardTitle>
        <CardDescription>
          Relationship between package size and cold start time across different
          runtimes
        </CardDescription>
        <CardAction>
          <div className="flex gap-2">
            <FilterDropdown
              label="runtimes"
              items={runtimes}
              selected={selectedRuntimes}
              onToggle={(v) =>
                setSelectedRuntimes(toggleSet(selectedRuntimes, v as string))
              }
              getColor={(item) => chartConfig[item as string].color}
              dropdownRef={runtimeDropdownRef}
              isOpen={isRuntimeDropdownOpen}
              setIsOpen={setIsRuntimeDropdownOpen}
            />
            <FilterDropdown
              label="arch"
              items={architectures}
              selected={selectedArchitectures}
              onToggle={(v) =>
                setSelectedArchitectures(
                  toggleSet(selectedArchitectures, v as Architecture)
                )
              }
              dropdownRef={architectureDropdownRef}
              isOpen={isArchitectureDropdownOpen}
              setIsOpen={setIsArchitectureDropdownOpen}
            />
            <FilterDropdown
              label="memory"
              items={memorySizes}
              selected={selectedMemorySizes}
              onToggle={(v) =>
                setSelectedMemorySizes(
                  toggleSet(selectedMemorySizes, v as MemorySize)
                )
              }
              dropdownRef={memorySizeDropdownRef}
              isOpen={isMemorySizeDropdownOpen}
              setIsOpen={setIsMemorySizeDropdownOpen}
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[500px] w-full">
          <ScatterChart margin={{ top: 20, right: 30, left: 50, bottom: 20 }}>
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
                style: { textAnchor: "middle" },
                dx: -15,
              }}
              className="text-xs"
            />
            <ZAxis range={[100, 100]} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0].payload as DataPoint;
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
                          <div className="text-[0.70rem]">
                            Package Type: {d.packageType}
                          </div>
                          <div className="text-[0.70rem]">
                            Package Size: {d.x.toFixed(2)} MB
                          </div>
                          <div className="text-[0.70rem]">
                            Cold Start: {d.y.toFixed(1)} ms
                          </div>
                          <div className="text-[0.70rem]">
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
                      {visibleRuntimes.map((runtime) => (
                        <div key={runtime} className="flex items-center gap-1">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: chartConfig[runtime].color,
                            }}
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
            {visibleRuntimes.map((runtime) => (
              <Scatter
                key={runtime}
                name={runtime}
                data={filteredData.filter((d) => d.runtime === runtime)}
                fill={chartConfig[runtime].color}
                shape={renderShape}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
