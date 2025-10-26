import fs from 'fs';
import { type Architecture, type Spec, type MemorySize, type PackageType, type Input, type Output } from "./types.js";
import { CreateFunctionCommand, DeleteFunctionCommand, GetFunctionCommand, InvokeCommand, LambdaClient, UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';
import { getAwsConfig } from './utils.js';

const lambdaClient = new LambdaClient({});
const { accountId, region } = await getAwsConfig();

const runtimes = [
    'dotnet8',
    'dotnet8_aot_al2023',
    'dotnet9_aot_al2023',
    'llrt',
    'nodejs22',
];

const architectures: Architecture[] = [
    'arm64',
    'x86_64',
];

const memorySizes: MemorySize[] = [
    128,
    256
];

const packageTypes: PackageType[] = [
    'zip',
    'image'
];

const specs: Spec[] =
    runtimes.flatMap(runtime =>
    architectures.flatMap(architecture =>
    memorySizes.flatMap(memorySize =>
    packageTypes.map(packageType => ({
        runtime,
        architecture,
        memorySize,
        packageType,
    })))));

const invocationCount = 1;
const arraySize = 2;
let executionsCount = 0;

const results = await Promise.all(specs.map(x => execute(x, invocationCount, arraySize)));
const failures = specs.filter((_, index) => !results[index]);

if (failures.length > 0) {
    console.error(`\n[error] ${failures.length} function(s) failed:`);
    failures.forEach(f => console.error(`  - ${getFunctionName(f.runtime, f.packageType, f.architecture, f.memorySize)}`));
    process.exit(1);
}

export async function execute(spec: Spec, invokeCount: number, arraySize: number): Promise<boolean> {
    const functionName = getFunctionName(spec.runtime, spec.packageType, spec.architecture, spec.memorySize);
    await createOrUpdateFunctionCode(spec);

    let success = true;

    for (let i = 0; i < invokeCount; i++) {
        await forceNextColdStart(functionName);

        const { input, expectedOutput } = generateInputAndExpectedOutput(arraySize);
        const response = await invokeFunction(functionName, JSON.stringify(input));
        executionsCount += 1;

        if (executionsCount % 10 === 0) {
            console.log(`[execute] ${executionsCount}/${invokeCount * specs.length} executions`);
        }

        if (!verifyNormalizedResponse(response, expectedOutput)) {
            console.error(`[error] Invalid response for function ${functionName}`);
            success = false;
            continue;
        }
    }

    await deleteFunction(functionName);

    return success;
}

export async function createOrUpdateFunctionCode(spec: Spec): Promise<void> {
    const functionName = getFunctionName(spec.runtime, spec.packageType, spec.architecture, spec.memorySize);
    const config = JSON.parse(fs.readFileSync(`runtimes/${spec.runtime}/config.json`, 'utf8'));
    
    try {
        const createCommandInput: any = {
            FunctionName: functionName,
            Role: `arn:aws:iam::${accountId}:role/lambda-exec-role`,
            Architectures: [spec.architecture],
            MemorySize: spec.memorySize,
        };

        if (spec.packageType == 'zip') {
            createCommandInput.PackageType = 'Zip';
            createCommandInput.Runtime = config.runtime;
            createCommandInput.Handler = config.handler;
            createCommandInput.Code = {
                S3Bucket: 'lambda-benchmark-packages',
                S3Key: `runtimes/${spec.runtime}/function_${spec.architecture}.zip`
            };
        } 

        if (spec.packageType == 'image') {
            createCommandInput.PackageType = 'Image';
            createCommandInput.Code = {
                ImageUri: `${accountId}.dkr.ecr.${region}.amazonaws.com/lambda-benchmark:${spec.runtime}-${spec.architecture}`
            };
        }

        const createCommand = new CreateFunctionCommand(createCommandInput);

        await lambdaClient.send(createCommand);

        await waitForFunctionActive(functionName);
        
    } catch (error: any) {
        if (error.name === 'ResourceConflictException') {

            const updateCodeCommand = new UpdateFunctionCodeCommand({
                FunctionName: functionName,
                ...(spec.packageType === 'zip' ? {
                    S3Bucket: 'lambda-benchmark-packages',
                    S3Key: `runtimes/${spec.runtime}/function_${spec.architecture}.zip`
                } : {
                    ImageUri: `${accountId}.dkr.ecr.${region}.amazonaws.com/lambda-benchmark:${spec.runtime}-${spec.architecture}`
                })
            });

            await lambdaClient.send(updateCodeCommand);

            await waitForFunctionActive(functionName);
        } else {
            throw error;
        }
    }

    console.log(`[execute] Deployed ${functionName}`);
}

export async function waitForFunctionActive(functionName: string, maxRetries: number = 10, initialDelayMs: number = 4000, delayMs: number = 2000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, initialDelayMs));

    for (let i = 0; i < maxRetries; i++) {
        try {
            const getCommand = new GetFunctionCommand({
                FunctionName: functionName
            });
            
            const response = await lambdaClient.send(getCommand);
            const state = response.Configuration?.State;
            const lastUpdateStatus = response.Configuration?.LastUpdateStatus;
            
            if (state === 'Active' && lastUpdateStatus === 'Successful') {
                return;
            }
            
            if (state === 'Failed') {
                throw new Error(`Function ${functionName} failed to become active`);
            }
            
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    throw new Error(`Function ${functionName} did not become active within ${maxRetries * delayMs / 1000} seconds`);
}

export async function forceNextColdStart(functionName: string): Promise<void> {

    const updateCommand = new UpdateFunctionConfigurationCommand({
        FunctionName: functionName,
        Environment: {
            Variables: {
                "REDEPLOY": new Date().getTime().toString()
            }
        }
    });

    await lambdaClient.send(updateCommand);

    await waitForFunctionActive(functionName);
}

export function generateInputAndExpectedOutput(arraySize: number): { input: Input, expectedOutput: Output } {
    const numbers: number[] = [];
    for (let i = 0; i < arraySize; i++) {
        numbers.push(Math.floor(Math.random() * 1_000) + 1);
    }

    const min = Math.min(...numbers);
    const normalized = numbers.map(x => x - min);
    return { input: { numbers }, expectedOutput: { inputNumbers: numbers, normalizedNumbers: normalized, min } };
}

export function verifyNormalizedResponse(output: Output, expectedOutput: Output): boolean {
    return output.min === expectedOutput.min
        && expectedOutput.inputNumbers.length === output.inputNumbers.length
        && expectedOutput.normalizedNumbers.length === output.normalizedNumbers.length
        && output.inputNumbers.every((x, i) => x === expectedOutput.inputNumbers[i])
        && output.normalizedNumbers.every((x, i) => x === expectedOutput.normalizedNumbers[i])
}

export async function invokeFunction(functionName: string, payload: string): Promise<any> {
    const apiGatewayRequest = {
        body: payload,
        httpMethod: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        multiValueHeaders: null,
        isBase64Encoded: false,
        path: '/invoke',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '123456789012',
            apiId: 'api-id',
            protocol: 'HTTP/1.1',
            httpMethod: 'POST',
            path: '/invoke',
            stage: 'prod',
            requestId: 'request-id',
            requestTime: new Date().toISOString(),
            requestTimeEpoch: Date.now(),
            identity: {
                cognitoIdentityPoolId: null,
                accountId: null,
                cognitoIdentityId: null,
                caller: null,
                sourceIp: '127.0.0.1',
                principalOrgId: null,
                accessKey: null,
                cognitoAuthenticationType: null,
                cognitoAuthenticationProvider: null,
                userArn: null,
                userAgent: 'Custom User Agent',
                user: null,
                apiKey: null,
                apiKeyId: null,
                clientCert: null
            },
            authorizer: null,
            domainName: 'api.example.com',
            domainPrefix: 'api',
            resourceId: 'resource-id',
            resourcePath: '/invoke'
        },
        resource: '/invoke'
    };

    const invokeCommand = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "RequestResponse",
        Payload: new TextEncoder().encode(JSON.stringify(apiGatewayRequest)),
    });

    const response = await lambdaClient.send(invokeCommand);

    const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
    return JSON.parse(responsePayload.body);
}

export async function deleteFunction(functionName: string): Promise<void> {
    const deleteCommand = new DeleteFunctionCommand({
        FunctionName: functionName,
    });

    await lambdaClient.send(deleteCommand);
}

export function getFunctionName(runtime: string, packageType: PackageType, architecture: Architecture, memorySize: MemorySize): string {
    return `${runtime}-${packageType}-${architecture}-${memorySize}`;
}