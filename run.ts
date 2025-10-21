import fs from 'fs';
import { analyze, createCustomImage, execute, loginToEcr, pack } from "./operations.js";
import { type Architecture, type Execute, type MemorySize, type Build, type PackageType, type Result } from "./types.js";

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";
const runType = process.argv[2];
if (runType != 'execute' && runType != 'analyze') {
    console.error(`[error] Invalid run type: ${runType}, use pnpm tsx run <execute|analyze>`);
    process.exit(1);
}

const runtimes = [
    // 'dotnet8',
    'dotnet8_aot_al2023',
    // 'llrt',
    // 'nodejs22',
];

const architectures: Architecture[] = [
    'arm64',
    // 'x86_64',
];

const memorySizes: MemorySize[] = [
    // 128,
    256
];

const packageTypes: PackageType[] = [
    // 'zip',
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

if (runType == 'execute') {
    console.log(`Creating ${runtimes.length * architectures.length} function packages...`);
    const zipSizes = await Promise.all(builds.map(pack));

    const registryUrl = await loginToEcr(REGION, ACCOUNT_ID);

    console.log(`Publishing ${runtimes.length * architectures.length} custom images...`);
    const imageSizes = await Promise.all(builds.map(x => createCustomImage(x, registryUrl)));

    const initialResult: Result = JSON.parse(fs.readFileSync('data/result.json', 'utf8'));
    initialResult.packageSizes = [ ...initialResult.packageSizes, ...zipSizes, ...imageSizes ];
    fs.writeFileSync('data/result.json', JSON.stringify(initialResult));

    await Promise.all(executions.map(x => execute(x, 5)));
}

if (runType == 'analyze') {
    const analysis = await Promise.all(executions.map(x => analyze(x, 1)));

    const result: Result = JSON.parse(fs.readFileSync('data/result.json', 'utf8'));
    result.analysis = analysis;
    fs.writeFileSync('data/result.json', JSON.stringify(result));

    const totalExecutions = analysis.reduce((acc, x) => acc + x.executions.length, 0);

    // const pricePerGbs: Record<Architecture, number> = {
    //     'arm64': 0.0000133334,
    //     'x86_64': 0.0000166667,
    // };
    // const totalPrice = analysis.reduce((acc, x) => acc + x.executions.reduce((acc, curr) => acc + curr.billedDuration || 0, 0) / x.executions.length, 0) / 1000 * (pricePerGbs[x.architecture]);
    console.log(`[success] Benchmarked ${totalExecutions} executions.`);
}