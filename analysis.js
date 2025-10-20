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
];

const pricePerGbs = {
    'arm64': 0.0000133334,
    'x86_64': 0.0000166667,
};
let totalPrice = 0;

const executions = [];
const packageSizes = JSON.parse(fs.readFileSync('data/packages.json', 'utf8'));
await analyseAll(runtimes, architectures, memorySizes);
fs.writeFileSync('data/executions.json', JSON.stringify(executions, null, 2));
console.log(`[success] Benchmark estimated cost: $${totalPrice.toFixed(5)}`);

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
    
    const functionName = getFunctionName(runtime, packageType, architecture, memorySize);
    const results = await queryCloudWatchLogs(functionName);

    const avgInitDuration = (results.reduce((acc, result) => acc + result.initDuration, 0) / results.length).toFixed(2);
    console.log(`[success] ${functionName} with ${results.length} executions, avg initDuration: ${avgInitDuration}ms`);

    if (results.some(result => result.initDuration === 0)) {
        console.error(`[error] Init duration is 0 for function ${functionName}`);
    }

    const totalBilledDuration = results.reduce((acc, result) => acc + result.billedDuration || 0, 0);
    totalPrice += (memorySize / 1024) * (totalBilledDuration / 1000) * (pricePerGbs[architecture]);

    executions.push({
        runtime,
        architecture,
        memorySize,
        packageSize: packageSizes[`${runtime}-${packageType}-${architecture}`],
        executions: results,
    });
}
