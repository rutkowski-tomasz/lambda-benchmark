import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createOrUpdateFunctionCode, updateFunctionConfiguration, invokeFunction, deleteFunction, queryCloudWatchLogs } from './lambda-utils.js';

const execAsync = promisify(exec);

const runtimes = fs.readdirSync('./runtimes', { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

const architectures = [
    'arm64',
];

const memorySizes = [
    128,
];

const invokeCount = 2;

for (const architecture of architectures) {
    for (const memorySize of memorySizes) {
        for (const runtime of runtimes) {
            await executeBenchmark(runtime, architecture, memorySize);
        }
    }
}

async function executeBenchmark(runtime, architecture, memorySize) {
    await execAsync(`(cd runtimes/${runtime} && ./pack.sh)`);

    const functionName = `${runtime}-${architecture}-${memorySize}`;
    
    await createOrUpdateFunctionCode(functionName, runtime, architecture, memorySize);

    for (let i = 0; i < invokeCount; i++) {
        await updateFunctionConfiguration(functionName, memorySize);

        console.log(`(${i + 1}/${invokeCount}) Invoking function ${functionName}`);
        await invokeFunction(functionName);
    }
    
    const results = await queryCloudWatchLogs(functionName);

    if (results.some(result => result.initDuration === 0)) {
        console.error(`[error] Init duration is 0 for function ${functionName}`);
    }

    const averageInitDuration = results.reduce((acc, result) => acc + result.initDuration, 0) / results.length;
    console.log(`Average init duration: ${averageInitDuration}ms`);
    
    await deleteFunction(functionName);
}