import { packAll } from './pack.js';
import { deployAll } from './deploy.js';

const runtimes = [
    'dotnet8',
    // 'llrt',
    'nodejs22',
];

const architectures = [
    'arm64',
    // 'x86_64',
];

const memorySizes = [
    128
];

await packAll(runtimes, architectures);
console.log('--- packing done ---');
await deployAll(runtimes, architectures, memorySizes);
console.log('--- deployment done ---');
