import { Chart } from './chart';
import fs from 'fs';
import path from 'path';
import { Benchmark } from './types';

export default function Home() {
  const benchmark: Benchmark = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), '../data/benchmark.json'), 'utf8')
  );

  return (
    <Chart benchmark={benchmark} />
  );
}
