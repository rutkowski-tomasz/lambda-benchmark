import fs from 'fs';
import { analyze, createCustomImage, execute, loginToEcr, pack } from "./operations.js";
import { type Architecture, type Execute, type MemorySize, type Build, type PackageType, type Benchmark } from "./types.js";
import { getFunctionName } from "./utils.js";

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";
const runType = process.argv[2];
if (runType != 'execute' && runType != 'analyze') {
    console.error(`[error] Invalid run type: ${runType}, use pnpm tsx run <execute|analyze>`);
    process.exit(1);
}

const runtimes = [
    'dotnet8',
    'dotnet8_aot_al2023',
    'dotnet9_aot_al2023',
    'llrt',
    'nodejs22',
];

const architectures: Architecture[] = [
    'arm64',
    'x86_64',
];

const memorySizes: MemorySize[] = [
    128,
    256
];

const packageTypes: PackageType[] = [
    'zip',
    'image'
];

const builds: Build[] =
    runtimes.flatMap(runtime =>
    architectures.map(architecture => ({
        runtime,
        architecture,
    })));

const executions: Execute[] =
    runtimes.flatMap(runtime =>
    architectures.flatMap(architecture =>
    memorySizes.flatMap(memorySize =>
    packageTypes.map(packageType => ({
        runtime,
        architecture,
        memorySize,
        packageType,
    })))));

const invocationCount = 5;
const arraySize = 100;

if (!fs.existsSync('data/benchmark.json')) {
    fs.writeFileSync('data/benchmark.json', '{}');
}

if (runType == 'execute') {
    console.log(`Creating ${runtimes.length * architectures.length} packages...`);
    const zipSizes = await Promise.all(builds.map(pack));

    const registryUrl = await loginToEcr(REGION, ACCOUNT_ID);

    console.log(`Publishing ${runtimes.length * architectures.length} custom images...`);
    const imageSizes = await Promise.all(builds.map(x => createCustomImage(x, registryUrl)));

    const _benchmark: Benchmark = JSON.parse(fs.readFileSync('data/benchmark.json', 'utf8'));
    _benchmark.packageSizes = [ ..._benchmark.packageSizes || [], ...zipSizes, ...imageSizes ];
    fs.writeFileSync('data/benchmark.json', JSON.stringify(_benchmark));

    const results = await Promise.all(executions.map(x => execute(x, invocationCount, arraySize)));
    const failures = executions.filter((_, index) => !results[index]);

    if (failures.length > 0) {
        console.error(`\n[error] ${failures.length} function(s) failed:`);
        failures.forEach(f => console.error(`  - ${getFunctionName(f.runtime, f.packageType, f.architecture, f.memorySize)}`));
        process.exit(1);
    }
}

if (runType == 'analyze') {
    const analysis = await Promise.all(executions.map(x => analyze(x, 1)));

    const benchmark: Benchmark = JSON.parse(fs.readFileSync('data/benchmark.json', 'utf8'));
    benchmark.analysis = analysis;
    fs.writeFileSync('data/benchmark.json', JSON.stringify(benchmark));

    const totalExecutions = analysis.reduce((acc, x) => acc + x.executions.length, 0);

    // const pricePerGbs: Record<Architecture, number> = {
    //     'arm64': 0.0000133334,
    //     'x86_64': 0.0000166667,
    // };
    // const totalPrice = analysis.reduce((acc, x) => acc + x.executions.reduce((acc, curr) => acc + curr.billedDuration || 0, 0) / x.executions.length, 0) / 1000 * (pricePerGbs[x.architecture]);
    const expectedExecutionsCount = runtimes.length * architectures.length * memorySizes.length * packageTypes.length * invocationCount;
    console.log(`[success] Benchmarked ${totalExecutions} executions (expected ${expectedExecutionsCount}).`);
}