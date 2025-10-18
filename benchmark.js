import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const architectures = [
    'arm64',
    // 'x86_64',
];

const memorySizes = [
    '128',
    // '256',
    // '512',
    // '1024'
];

const runtimes = fs.readdirSync('./runtimes', { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

for (const architecture of architectures) {
    for (const memorySize of memorySizes) {
        for (const runtime of runtimes) {
            await executeBenchmark(runtime, architecture, memorySize);
        }
    }
}

async function executeBenchmark(runtime, architecture, memorySize) {
    await execAsync(`(cd runtimes/${runtime}/src && zip -r ../function.zip .)`);
}