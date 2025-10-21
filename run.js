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

const packageTypes = [
    'zip',
    'image'
];

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";

const packageSizes = {};
await packAll(runtimes, architectures);
await execAsync(`aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com`);
await createCustomImageAll(runtimes, architectures);
fs.writeFileSync('data/packages.json', JSON.stringify(packageSizes, null, 2));
await executeAll(runtimes, packageTypes, architectures, memorySizes);


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
    packageSizes[`${runtime}-zip-${architecture}`] = size;
    console.log(`[success] Packed ${runtime} - ${architecture} (${packPath}, ${formatSize(size)})`);
}

export async function createCustomImageAll(runtimes, architectures) {
    console.log(`Creating ${runtimes.length * architectures.length} custom images...`);
    await Promise.all(
        runtimes.flatMap(runtime =>
            architectures.map(architecture => createCustomImage(runtime, architecture))
        )
    );
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
    try {
        await execAsync(buildCommand);
    } catch (error) {
        console.log(`[error] build command failed: ${buildCommand}`);
        throw error;
    }

    await execAsync(`docker push ${tag}`);

    const size = parseInt((await execAsync(`docker inspect -f '{{ .Size }}' ${tag}`)).stdout.trim());
    packageSizes[`${runtime}-image-${architecture}`] = size;

    console.log(`[success] Created custom image ${runtime} - ${architecture} (${tag}, ${formatSize(size)})`);
}

export async function executeAll(runtimes, packageTypes, architectures, memorySizes) {

    console.log(`Executing ${runtimes.length * packageTypes.length * architectures.length * memorySizes.length} functions...`);
    await Promise.all(
        runtimes.flatMap(runtime =>
            packageTypes.flatMap(packageType =>
                architectures.flatMap(architecture =>
                    memorySizes.map(memorySize =>
                        execute(runtime, architecture, memorySize, packageType)
                    )
                )
            )
        )
    );
}

export async function execute(runtime, architecture, memorySize, packageType, invokeCount = 2) {
    const functionName = getFunctionName(runtime, packageType, architecture, memorySize);
    await createOrUpdateFunctionCode(runtime, architecture, memorySize, packageType);

    for (let i = 0; i < invokeCount; i++) {
        await updateFunctionConfiguration(runtime, packageType, architecture, memorySize);

        console.log(`(${i + 1}/${invokeCount}) Invoking function ${functionName}`);

        const response = await invokeFunction(functionName);
        if (response.message !== "Hello from Lambda!") {
            console.error(`[error] Invalid response for function ${functionName}`);
            continue;
        }
    }

    await deleteFunction(functionName);
}
