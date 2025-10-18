import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createOrUpdateFunctionCode, updateFunctionConfiguration, invokeFunction, deleteFunction, queryCloudWatchLogs } from './lambda-utils.js';

const execAsync = promisify(exec);

const runtimes = [
    // 'dotnet',
    'llrt',
    // 'nodejs22',
];

const architectures = [
    'arm64',
    // 'x86_64',
];

const memorySizes = [
    128,
    // 256,
];

const randomSuffix = Math.random().toString(36).substring(2, 8);
const invokeCount = 3;
let estimatedCost = 0;
const gbsCost = {
    'arm64': 0.0000133334,
    'x86_64': 0.0000166667,
};

const benchmarkParams = [];
for (const architecture of architectures) {
    for (const memorySize of memorySizes) {
        for (const runtime of runtimes) {
            benchmarkParams.push({ runtime, architecture, memorySize });
        }
    }
}

console.log(`Packing ${runtimes.length} runtimes...`);
await Promise.all(runtimes.map(runtime =>
    execAsync(`(cd runtimes/${runtime} && ./pack.sh arm64)`)
));

console.log(`Starting ${benchmarkParams.length} benchmarks in parallel...`);
await Promise.all(
    benchmarkParams.map(({ runtime, architecture, memorySize }) => 
        executeBenchmark(runtime, architecture, memorySize)
    )
);

async function executeBenchmark(runtime, architecture, memorySize) {
    const functionName = `${runtime}-${architecture}-${memorySize}-${randomSuffix}`;
    
    await createOrUpdateFunctionCode(functionName, runtime, architecture, memorySize);

    for (let i = 0; i < invokeCount; i++) {
        await updateFunctionConfiguration(functionName, memorySize);

        console.log(`(${i + 1}/${invokeCount}) Invoking function ${functionName}`);
        const response = await invokeFunction(functionName);
        if (response.message !== "Hello from Lambda!") {
            console.error(`[error] Invalid response for function ${functionName}`);
            continue;
        }
    }

    console.log(`Waiting 120 seconds for logs to be available for ${functionName}...`);
    await new Promise(resolve => setTimeout(resolve, 120_000));
    
    const results = await queryCloudWatchLogs(functionName);

    if (results.some(result => result.initDuration === 0)) {
        console.error(`[error] Init duration is 0 for function ${functionName}`);
    }

    const packageSize = Math.round(fs.statSync(`runtimes/${runtime}/function.zip`).size / 1024, 1);
    const averageInitDuration = results.reduce((acc, result) => acc + result.initDuration, 0) / results.length;
    console.log(`${functionName}: packageSize: ${packageSize} KB, avg initDuration: ${averageInitDuration.toFixed(2)}ms`);
    
    const functionCost = results.reduce((acc, result) => {
        const billedDuration = result.billedDuration / 1000;
        const memorySize = result.memorySize / 1024;
        const costPerGBs = gbsCost[architecture];
        if (!billedDuration || !memorySize || !costPerGBs) {
            console.log(`${result.functionName}: billedDuration: ${result.billedDuration}ms, memorySize: ${result.memorySize}MB, architecture: ${architecture}`);
            return acc;
        }

        return acc + (billedDuration * memorySize * costPerGBs);
    }, 0);
    
    estimatedCost += functionCost;
    await deleteFunction(functionName);
}

console.log(`Estimated cost: $${estimatedCost.toFixed(5)}`);