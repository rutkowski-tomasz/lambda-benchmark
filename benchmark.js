import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ensureFunctionCreated, updateFunctionConfiguration, invokeFunction, deleteFunction } from './lambda-utils.js';

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


for (const architecture of architectures) {
    for (const memorySize of memorySizes) {
        for (const runtime of runtimes) {
            await executeBenchmark(runtime, architecture, memorySize);
        }
    }
}

async function executeBenchmark(runtime, architecture, memorySize) {
    await execAsync(`(cd runtimes/${runtime}/src && zip -r ../function.zip .)`);

    const functionName = `${runtime}-${architecture}-${memorySize}`;
    
    await ensureFunctionCreated(functionName, runtime, architecture, memorySize);

    await updateFunctionConfiguration(functionName, memorySize);
    
    await invokeFunction(functionName);
    
    // await deleteFunction(functionName);
}