import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
    getFunctionName,
    getPackPath,
    formatSize,
    createOrUpdateFunctionCode,
    updateFunctionConfiguration,
    invokeFunction,
    deleteFunction
} from './lambda-utils.js';

const execAsync = promisify(exec);

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
    128
];

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";

// const packageSizes = {};
// await packAll(runtimes, architectures);
// fs.writeFileSync('data/packages.json', JSON.stringify(packageSizes, null, 2));
// await executeAll(runtimes, architectures, memorySizes);

await createCustomImage('dotnet8', 'arm64');

export async function packAll(runtimes, architectures) {

    console.log(`Packing ${runtimes.length * architectures.length} functions...`);
    await Promise.all(
        runtimes.flatMap(runtime =>
            architectures.map(architecture => pack(runtime, architecture))
        )
    );
}

export async function pack(runtime, architecture) {

    const packPath = getPackPath(runtime, architecture);
    if (fs.existsSync(packPath)) {
        fs.unlinkSync(packPath);
    }

    const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const imageTag = `${runtime}_${architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${runtime} --build-arg ARCHITECTURE=${architecture} -t ${imageTag}`;

    try {
        await execAsync(buildCommand);
    } catch (error) {
        console.error(`[error] build command failed: ${buildCommand}`);
        throw error;
    }

    const dockerId = (await execAsync(`docker create ${imageTag}`)).stdout.trim();
    const copyCommand = `docker cp ${dockerId}:/function.zip ${packPath}`;

    try {
        await execAsync(copyCommand);
    } catch (error) {
        console.error(`[error] copy command failed: ${copyCommand}`);
    }

    const size = fs.statSync(packPath).size;
    packageSizes[`${runtime}-${architecture}`] = size;
    console.log(`[success] Packed ${runtime} - ${architecture} (${packPath}, ${formatSize(size)})`);
}

export async function createCustomImage(runtime, architecture) {
    const configFile = fs.readFileSync(`runtimes/${runtime}/config.json`, 'utf8');
    const config = JSON.parse(configFile);
    const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const extractPath = `runtimes/${runtime}/function_${architecture}`;

    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }
    
    await execAsync(`unzip runtimes/${runtime}/function_${architecture}.zip -d ${extractPath}`);

    const tag = `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/lambda-benchmark:${runtime}-${architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${runtime} -f Dockerfile.custom_image --build-arg BASE_IMAGE=${config.baseImage} --build-arg HANDLER=${config.handler} --build-arg ARCHITECTURE=${architecture} -t ${tag}`;

    console.log('buildCommand', buildCommand);

    await execAsync(buildCommand);

    await execAsync(`aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com`);

    await execAsync(`docker push ${tag}`);
}

export async function executeAll(runtimes, architectures, memorySizes) {

    console.log(`Executing ${runtimes.length * architectures.length * memorySizes.length} functions...`);
    await Promise.all(
        runtimes.flatMap(runtime =>
            architectures.flatMap(architecture =>
                memorySizes.map(memorySize => execute(runtime, architecture, memorySize))
            )
        )
    );
}

export async function execute(runtime, architecture, memorySize, invokeCount = 10) {
    const functionName = getFunctionName(runtime, architecture, memorySize);
    await createOrUpdateFunctionCode(runtime, architecture, memorySize);

    for (let i = 0; i < invokeCount; i++) {
        await updateFunctionConfiguration(runtime, architecture, memorySize);

        console.log(`(${i + 1}/${invokeCount}) Invoking function ${functionName}`);

        const response = await invokeFunction(functionName);
        if (response.message !== "Hello from Lambda!") {
            console.error(`[error] Invalid response for function ${functionName}`);
            continue;
        }
    }

    await deleteFunction(functionName);
}
