import fs from 'fs';
import { LambdaClient, UpdateFunctionCodeCommand, CreateFunctionCommand, DeleteFunctionCommand, InvokeCommand, GetFunctionCommand, UpdateFunctionConfigurationCommand } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } from "@aws-sdk/client-cloudwatch-logs";

const ACCOUNT_ID = "024853653660";
const lambdaClient = new LambdaClient({ region: "eu-central-1" });
const cloudWatchLogsClient = new CloudWatchLogsClient({ region: "eu-central-1" });

export async function createOrUpdateFunctionCode(functionName, runtime, architecture, memorySize) {
    const zipBuffer = fs.readFileSync(`runtimes/${runtime}/function.zip`);
    
    const configFile = fs.readFileSync(`runtimes/${runtime}/config.json`, 'utf8');
    const config = JSON.parse(configFile);
    
    try {
        const createCommand = new CreateFunctionCommand({
            FunctionName: functionName,
            Runtime: config.runtime,
            Role: `arn:aws:iam::${ACCOUNT_ID}:role/lambda-exec-role`,
            Handler: config.handler,
            Code: { ZipFile: zipBuffer },
            Architectures: [architecture],
        });

        await lambdaClient.send(createCommand);
        console.log(`Created function: ${functionName} with architecture: ${architecture}`);
        
        await waitForFunctionActive(functionName);
        
    } catch (error) {
        if (error.name === 'ResourceConflictException') {
            const updateCodeCommand = new UpdateFunctionCodeCommand({
                FunctionName: functionName,
                ZipFile: zipBuffer,
            });
            
            await lambdaClient.send(updateCodeCommand);
            console.log(`Function ${functionName} already exists, updating code...`);
            
            await waitForFunctionActive(functionName);
        } else {
            throw error;
        }
    }
}

export async function waitForFunctionActive(functionName, maxRetries = 5, initialDelayMs = 2000, delayMs = 2000) {
    await new Promise(resolve => setTimeout(resolve, initialDelayMs));

    for (let i = 0; i < maxRetries; i++) {
        try {
            const getCommand = new GetFunctionCommand({
                FunctionName: functionName
            });
            
            const response = await lambdaClient.send(getCommand);
            const state = response.Configuration.State;
            const lastUpdateStatus = response.Configuration.LastUpdateStatus;
            
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

export async function updateFunctionConfiguration(functionName, memorySize) {
    const updateCommand = new UpdateFunctionConfigurationCommand({
        FunctionName: functionName,
        MemorySize: memorySize,
    });

    await lambdaClient.send(updateCommand);
    console.log(`Updated function configuration: ${functionName} to memory size: ${memorySize}`);
    
    await waitForFunctionActive(functionName);
}

export async function invokeFunction(functionName) {
    const invokeCommand = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "RequestResponse"
    });
    
    const response = await lambdaClient.send(invokeCommand);
    
    const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
    // console.log(`Invoked function ${functionName}:`, responsePayload);
    return responsePayload;
}

export async function deleteFunction(functionName) {
    const deleteCommand = new DeleteFunctionCommand({
        FunctionName: functionName,
    });

    await lambdaClient.send(deleteCommand);
    console.log(`Deleted function: ${functionName}`);
}

export async function queryCloudWatchLogs(functionName, hoursBack = 12) {
    const startCommand = new StartQueryCommand({
        logGroupName: `/aws/lambda/${functionName}`,
        startTime: Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000),
        endTime: Math.floor(Date.now() / 1000),
        queryString: "fields @timestamp, @duration, @initDuration, @billedDuration, @maxMemoryUsed, @memorySize, @entity.Attributes.Lambda.Function | filter @message like /REPORT/ | sort @timestamp desc"
    });

    const { queryId } = await cloudWatchLogsClient.send(startCommand);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const resultsCommand = new GetQueryResultsCommand({ queryId });
    const results = await cloudWatchLogsClient.send(resultsCommand);

    const tableData = results.results.map((row, index) => {
        const duration = row.find(field => field.field === '@duration')?.value;
        const initDuration = row.find(field => field.field === '@initDuration')?.value || '0';
        const billedDuration = row.find(field => field.field === '@billedDuration')?.value;
        const maxMemoryUsed = row.find(field => field.field === '@maxMemoryUsed')?.value;
        const memorySize = row.find(field => field.field === '@memorySize')?.value;
        const functionName = row.find(field => field.field === '@entity.Attributes.Lambda.Function')?.value;

        return {
            functionName: functionName,
            initDuration: parseFloat(initDuration),
            duration: parseFloat(duration),
            billedDuration: parseFloat(billedDuration),
            memoryUsed: Math.round(maxMemoryUsed / 1_000_000),
            memorySize: Math.round(memorySize / 1_000_000)
        };
    });
    
    return tableData;
}
