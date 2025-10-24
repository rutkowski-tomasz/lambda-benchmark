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
import type { Architecture, Benchmark, MemorySize } from "./types";

type DataPoint = {
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

const CustomShape = (props: {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: DataPoint;
}) => {
  const { cx = 0, cy = 0, fill, payload } = props;
  const size = 8;
  if (!payload) return null;

  const key = `${payload.architecture}-${payload.packageType}`;
  switch (key) {
    case "arm64-zip":
      return <circle cx={cx} cy={cy} r={size / 2} fill={fill} />;
    case "arm64-image":
      return (
        <polygon
          points={`${cx},${cy - size / 2} ${cx - size / 2},${cy + size / 2} ${cx + size / 2},${cy + size / 2}`}
          fill={fill}
        />
      );
    case "x86_64-zip":
      return (
        <rect
          x={cx - size / 2}
          y={cy - size / 2}
          width={size}
          height={size}
          fill={fill}
        />
      );
    case "x86_64-image":
      return (
        <polygon
          points={`${cx},${cy - size / 2} ${cx + size / 2},${cy} ${cx},${cy + size / 2} ${cx - size / 2},${cy}`}
          fill={fill}
        />
      );
    default:
      return <circle cx={cx} cy={cy} r={size / 2} fill={fill} />;
  }
};

export function CostAnalysis({ benchmark }: { benchmark: Benchmark }) {
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

  const data: DataPoint[] = [];
  const runtimeSet = new Set<string>();
  const architectureSet = new Set<Architecture>();
  const memorySizeSet = new Set<MemorySize>();
  const packageTypeSet = new Set<string>();

  for (const analysis of benchmark.analysis) {
    runtimeSet.add(analysis.runtime);
    architectureSet.add(analysis.architecture);
    memorySizeSet.add(analysis.memorySize);
    packageTypeSet.add(analysis.packageType);

    const avgDuration =
      analysis.executions.reduce((acc, curr) => acc + curr.duration, 0) /
      analysis.executions.length;
    const avgBilledDuration =
      analysis.executions.reduce((acc, curr) => acc + curr.billedDuration, 0) /
      analysis.executions.length;
    const avgMemoryUsed =
      analysis.executions.reduce((acc, curr) => acc + curr.memoryUsed, 0) /
      analysis.executions.length;
    const packageSize = benchmark.packageSizes.find(
      (x) =>
        x.runtime === analysis.runtime &&
        x.architecture === analysis.architecture &&
        x.packageType === analysis.packageType
    )?.size;

    data.push({
      runtime: analysis.runtime,
      configuration: `${analysis.runtime} ${analysis.architecture} ${analysis.memorySize}MB`,
      avgDuration,
      costPerMillion:
        calculateCost(
          avgBilledDuration,
          analysis.memorySize,
          analysis.architecture
        ) * 1_000_000,
      architecture: analysis.architecture,
      memorySize: analysis.memorySize,
      packageType: analysis.packageType,
      packageSize,
      memoryUsed: avgMemoryUsed,
      billedDuration: avgBilledDuration,
      executionsCount: analysis.executions.length,
    });
  }

  const runtimes = Array.from(runtimeSet).sort();
  const architectures = Array.from(architectureSet).sort();
  const memorySizes = Array.from(memorySizeSet).sort((a, b) => a - b);
  const packageTypes = Array.from(packageTypeSet).sort();

  const [selectedRuntimes, setSelectedRuntimes] = useState<Set<string>>(
    () => new Set(runtimes)
  );
  const [selectedArchitectures, setSelectedArchitectures] = useState<
    Set<Architecture>
  >(() => new Set(architectures));
  const [selectedMemorySizes, setSelectedMemorySizes] = useState<
    Set<MemorySize>
  >(() => new Set(memorySizes));
  const [selectedPackageTypes, setSelectedPackageTypes] = useState<Set<string>>(
    () => new Set(packageTypes)
  );
  const [isRuntimeDropdownOpen, setIsRuntimeDropdownOpen] = useState(false);
  const [isArchitectureDropdownOpen, setIsArchitectureDropdownOpen] =
    useState(false);
  const [isMemorySizeDropdownOpen, setIsMemorySizeDropdownOpen] =
    useState(false);
  const [isPackageTypeDropdownOpen, setIsPackageTypeDropdownOpen] =
    useState(false);
  const runtimeDropdownRef = useRef<HTMLDivElement>(null);
  const architectureDropdownRef = useRef<HTMLDivElement>(null);
  const memorySizeDropdownRef = useRef<HTMLDivElement>(null);
  const packageTypeDropdownRef = useRef<HTMLDivElement>(null);

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
      if (
        packageTypeDropdownRef.current &&
        !packageTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPackageTypeDropdownOpen(false);
      }
    };

    if (
      isRuntimeDropdownOpen ||
      isArchitectureDropdownOpen ||
      isMemorySizeDropdownOpen ||
      isPackageTypeDropdownOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [
    isRuntimeDropdownOpen,
    isArchitectureDropdownOpen,
    isMemorySizeDropdownOpen,
    isPackageTypeDropdownOpen,
  ]);

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

  const filteredData = data.filter(
    (d) =>
      selectedRuntimes.has(d.runtime) &&
      selectedArchitectures.has(d.architecture) &&
      selectedMemorySizes.has(d.memorySize) &&
      selectedPackageTypes.has(d.packageType)
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
        <CardTitle>Cost vs Duration Analysis</CardTitle>
        <CardDescription>
          Cost per million requests vs average duration by runtime
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
            <FilterDropdown
              label="package type"
              items={packageTypes}
              selected={selectedPackageTypes}
              onToggle={(v) =>
                setSelectedPackageTypes(
                  toggleSet(selectedPackageTypes, v as string)
                )
              }
              dropdownRef={packageTypeDropdownRef}
              isOpen={isPackageTypeDropdownOpen}
              setIsOpen={setIsPackageTypeDropdownOpen}
            />
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
                if (active && payload?.length) {
                  const d = payload[0].payload as DataPoint;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid gap-2">
                        <span className="text-[0.70rem] font-semibold">
                          {d.configuration}
                        </span>
                        <div className="grid gap-1 text-[0.70rem]">
                          <div>Runtime: {d.runtime}</div>
                          <div>Executions: {d.executionsCount}</div>
                          <div>
                            Package Size:{" "}
                            {d.packageSize !== undefined
                              ? formatSize(d.packageSize)
                              : "N/A"}
                          </div>
                          <div>Memory Used: {d.memoryUsed.toFixed(1)} MB</div>
                          <div>Package Type: {d.packageType}</div>
                          <div>Avg Duration: {d.avgDuration.toFixed(1)} ms</div>
                          <div>
                            Avg Billed Duration: {d.billedDuration.toFixed(1)}{" "}
                            ms
                          </div>
                          <div>
                            Cost per 1M requests: ${d.costPerMillion.toFixed(2)}
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
                shape={<CustomShape />}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
