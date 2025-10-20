import { packAll } from './pack.js';

const runtimes = [
    'dotnet8',
    // 'llrt',
    'nodejs22',
];

const architectures = [
    'arm64',
    'x86_64',
];

await packAll(runtimes, architectures);
console.log('Done');