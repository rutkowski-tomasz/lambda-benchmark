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
    deleteFunction,
    queryCloudWatchLogs,
    generateTestNumbers,
    serializeInput,
    verifyNormalizedResponse
} from './utils.js';
import { type Analysis, type Architecture, type Build, type Execute, type PackageType } from './types.js';

const execAsync = promisify(exec);

export async function pack(build: Build): Promise<{ runtime: string, architecture: Architecture, packageType: PackageType, size: number }> {

    const packPath = getPackPath(build.runtime, build.architecture);
    if (fs.existsSync(packPath)) {
        fs.unlinkSync(packPath);
    }

    const platform = build.architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const imageTag = `${build.runtime}_${build.architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${build.runtime} --build-arg ARCHITECTURE=${build.architecture} -t ${imageTag}`;

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
    console.log(`[success] Packed ${packPath}, ${formatSize(size)}`);
    return { runtime: build.runtime, architecture: build.architecture, packageType: 'zip', size };
}

export async function createCustomImage(build: Build, registryUrl: string): Promise<{ runtime: string, architecture: Architecture, packageType: PackageType, size: number }> {
    const configFile = fs.readFileSync(`runtimes/${build.runtime}/config.json`, 'utf8');
    const config = JSON.parse(configFile);
    const platform = build.architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const extractPath = `runtimes/${build.runtime}/function_${build.architecture}`;

    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }
    
    await execAsync(`unzip runtimes/${build.runtime}/function_${build.architecture}.zip -d ${extractPath}`);

    const tag = `${registryUrl}/lambda-benchmark:${build.runtime}-${build.architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${build.runtime} -f Dockerfile.custom_image --build-arg BASE_IMAGE=${config.baseImage} --build-arg HANDLER=${config.handler} --build-arg ARCHITECTURE=${build.architecture} -t ${tag}`;
    try {
        await execAsync(buildCommand);
    } catch (error) {
        console.log(`[error] build command failed: ${buildCommand}`);
        throw error;
    }

    await execAsync(`docker push ${tag}`);

    const size = parseInt((await execAsync(`docker inspect -f '{{ .Size }}' ${tag}`)).stdout.trim());

    console.log(`[success] Created image ${tag}, ${formatSize(size)}`);
    return { runtime: build.runtime, architecture: build.architecture, packageType: 'image', size };
}

export async function loginToEcr(region: string, accountId: string) {

    await execAsync(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${region}.amazonaws.com`);
    return `${accountId}.dkr.ecr.${region}.amazonaws.com`;
}

export async function execute(execute: Execute, invokeCount: number, arraySize: number): Promise<boolean> {
    const functionName = getFunctionName(execute.runtime, execute.packageType, execute.architecture, execute.memorySize);
    await createOrUpdateFunctionCode(execute.runtime, execute.architecture, execute.memorySize, execute.packageType);

    let success = true;

    for (let i = 0; i < invokeCount; i++) {
        await updateFunctionConfiguration(execute.runtime, execute.packageType, execute.architecture, execute.memorySize);

        console.log(`(${i + 1}/${invokeCount}) Invoking function ${functionName}`);

        const inputNumbers = generateTestNumbers(arraySize);
        const inputPayload = serializeInput(inputNumbers);
        const response = await invokeFunction(functionName, inputPayload);

        if (!verifyNormalizedResponse(inputNumbers, response)) {
            console.error(`[error] Invalid response for function ${functionName}`);
            success = false;
            continue;
        }
    }

    await deleteFunction(functionName);

    return success;
}

export async function analyze(execute: Execute, hoursBack: number): Promise<Analysis> {
    
    const functionName = getFunctionName(execute.runtime, execute.packageType, execute.architecture, execute.memorySize);
    const results = await queryCloudWatchLogs(functionName, hoursBack);
    const coldStartExecutions = results.filter(x => x.initDuration > 0);

    if (coldStartExecutions.length === 0) {
        console.warn(`[warn] ${functionName} got no executions`);
    }

    return {
        runtime: execute.runtime,
        packageType: execute.packageType,
        architecture: execute.architecture,
        memorySize: execute.memorySize,
        executions: coldStartExecutions,
    };
}
