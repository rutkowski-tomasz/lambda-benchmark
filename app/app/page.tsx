import { Chart } from './chart';
import fs from 'fs';
import path from 'path';

export default function Home() {
  const executions = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), '../data/executions.json'), 'utf8')
  );

  return (
    <Chart executions={executions} />
  );
}
