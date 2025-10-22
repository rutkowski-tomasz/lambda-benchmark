import fs from "node:fs";
import path from "node:path";
import { Chart } from "./chart";
import type { Benchmark } from "./types";

export default function Home() {
  const benchmark: Benchmark = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "../data/benchmark.json"), "utf8")
  );

  return <Chart benchmark={benchmark} />;
}
