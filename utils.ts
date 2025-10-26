import fs from 'fs';
import { LambdaClient, UpdateFunctionCodeCommand, CreateFunctionCommand, DeleteFunctionCommand, InvokeCommand, GetFunctionCommand, UpdateFunctionConfigurationCommand } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { type Architecture, type PackageType, type MemorySize, type ExecutionData, type Input, type Output } from './types.js';

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";
const lambdaClient = new LambdaClient({ region: "eu-central-1" });
const cloudWatchLogsClient = new CloudWatchLogsClient({ region: "eu-central-1" });

export async function createOrUpdateFunctionCode(runtime: string, architecture: Architecture, memorySize: MemorySize, packageType: PackageType): Promise<void> {
    const functionName = getFunctionName(runtime, packageType, architecture, memorySize);
    const zipBuffer = fs.readFileSync(`runtimes/${runtime}/function_${architecture}.zip`);
    
    const configFile = fs.readFileSync(`runtimes/${runtime}/config.json`, 'utf8');
    const config = JSON.parse(configFile);
    
    try {
        const createCommandInput: any = {
            FunctionName: functionName,
            Role: `arn:aws:iam::${ACCOUNT_ID}:role/lambda-exec-role`,
            Architectures: [architecture],
            MemorySize: memorySize,
        };

        if (packageType == 'zip') {
            createCommandInput.PackageType = 'Zip';
            createCommandInput.Runtime = config.runtime;
            createCommandInput.Handler = config.handler;
            createCommandInput.Code = {
                ZipFile: zipBuffer
            };
        } 

        if (packageType == 'image') {
            createCommandInput.PackageType = 'Image';
            createCommandInput.Code = {
                ImageUri: `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/lambda-benchmark:${runtime}-${architecture}`
            };
        }

        const createCommand = new CreateFunctionCommand(createCommandInput);

        await lambdaClient.send(createCommand);

        await waitForFunctionActive(functionName);
        
    } catch (error: any) {
        if (error.name === 'ResourceConflictException') {
            const updateCodeCommand = new UpdateFunctionCodeCommand({
                FunctionName: functionName,
            });

            if (packageType == 'zip') {
                updateCodeCommand.input.ZipFile = zipBuffer;
            } 

            if (packageType == 'image') {
                updateCodeCommand.input.ImageUri = `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/lambda-benchmark:${runtime}-${architecture}`;
            }
            
            await lambdaClient.send(updateCodeCommand);

            await waitForFunctionActive(functionName);
        } else {
            throw error;
        }
    }

    console.log(`[success] Deployed ${functionName}`);
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

export async function updateFunctionConfiguration(runtime: string, packageType: PackageType, architecture: Architecture, memorySize: MemorySize): Promise<void> {

    const functionName = getFunctionName(runtime, packageType, architecture, memorySize);
    const updateCommand = new UpdateFunctionConfigurationCommand({
        FunctionName: functionName,
        MemorySize: memorySize,
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
    try {
        // console.log('expectedOutput', expectedOutput);
        // console.log('output', output);

        return output.min === expectedOutput.min
            && expectedOutput.inputNumbers.length === output.inputNumbers.length
            && expectedOutput.normalizedNumbers.length === output.normalizedNumbers.length
            && output.inputNumbers.every((x, i) => x === expectedOutput.inputNumbers[i])
            && output.normalizedNumbers.every((x, i) => x === expectedOutput.normalizedNumbers[i])

    } catch (error) {
        console.error('error', error);
        return false;
    }
}

export async function invokeFunction(functionName: string, payload: string): Promise<any> {
    const apiGatewayRequest = {
        body: payload
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

export async function queryCloudWatchLogs(functionName: string, hoursBack: number): Promise<ExecutionData[]> {
    const startCommand = new StartQueryCommand({
        logGroupName: `/aws/lambda/${functionName}`,
        startTime: Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000),
        endTime: Math.floor(Date.now() / 1000),
        queryString: "fields @timestamp, @duration, @initDuration, @billedDuration, @maxMemoryUsed | filter @message like /^REPORT/ | sort @timestamp desc"
    });

    const { queryId } = await cloudWatchLogsClient.send(startCommand);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const resultsCommand = new GetQueryResultsCommand({ queryId });
    const results = await cloudWatchLogsClient.send(resultsCommand);

    const tableData = (results.results || []).map((row, index) => {
        const duration = row.find(field => field.field === '@duration')?.value;
        const initDuration = row.find(field => field.field === '@initDuration')?.value || '0';
        const billedDuration = row.find(field => field.field === '@billedDuration')?.value;
        const maxMemoryUsed = row.find(field => field.field === '@maxMemoryUsed')?.value;

        return {
            initDuration: parseFloat(initDuration || '0'),
            duration: parseFloat(duration || '0'),
            billedDuration: parseFloat(billedDuration || '0'),
            memoryUsed: parseInt(maxMemoryUsed || '0') / 1_000_000,
        };
    });
    
    return tableData;
}

export function getPackPath(runtime: string, architecture: Architecture): string {
    return `runtimes/${runtime}/function_${architecture}.zip`;
}

export function getFunctionName(runtime: string, packageType: PackageType, architecture: Architecture, memorySize: MemorySize): string {
    return `${runtime}-${packageType}-${architecture}-${memorySize}`;
}

export function formatSize(bytes: number): string {
    if (bytes === 0) {
        return '0 bytes';
    }
    
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const k = 1024;
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    if (value >= 10) {
        return value.toFixed(0) + ' ' + units[i];
    }

    return value.toFixed(1) + ' ' + units[i];
}
