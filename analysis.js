import fs from 'fs';
import { queryCloudWatchLogs, getFunctionName } from './lambda-utils.js';

const runtimes = [
    'dotnet8',
    'llrt',
    'nodejs22',
];

const architectures = [
    'arm64',
    'x86_64',
];

const memorySizes = [
    128,
    // 256,
];

const packageTypes = [
    'zip',
    'image'
]

const executions = [];
const packageSizes = JSON.parse(fs.readFileSync('data/packages.json', 'utf8'));
await analyseAll(runtimes, architectures, memorySizes);
fs.writeFileSync('data/executions.json', JSON.stringify(executions, null, 2));

async function analyseAll() {
    console.log(`Starting ${runtimes.length * packageTypes.length * architectures.length * memorySizes.length} analysis...`);
    await Promise.all(
        runtimes.flatMap(runtime =>
            packageTypes.flatMap(packageType => 
                architectures.flatMap(architecture =>
                    memorySizes.map(memorySize =>
                        analyze(runtime, packageType, architecture, memorySize)
                    )
                )
            )
        )
    );
}

async function analyze(runtime, packageType, architecture, memorySize) {
    
    const functionName = getFunctionName(runtime, architecture, memorySize);
    const results = await queryCloudWatchLogs(functionName);

    const avgInitDuration = (results.reduce((acc, result) => acc + result.initDuration, 0) / results.length).toFixed(2);
    console.log(`[success] ${functionName} with ${results.length} executions, avg initDuration: ${avgInitDuration}ms`);

    if (results.some(result => result.initDuration === 0)) {
        console.error(`[error] Init duration is 0 for function ${functionName}`);
    }

    executions.push({
        runtime,
        architecture,
        memorySize,
        packageSize: packageSizes[`${runtime}-${packageType}-${architecture}`],
        executions: results,
    });
}
