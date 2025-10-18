import fs from 'fs';
import { LambdaClient, UpdateFunctionCodeCommand, CreateFunctionCommand, DeleteFunctionCommand, InvokeCommand, GetFunctionCommand, UpdateFunctionConfigurationCommand } from "@aws-sdk/client-lambda";

const ACCOUNT_ID = "024853653660";
const lambdaClient = new LambdaClient({ region: "eu-central-1" });

export async function ensureFunctionCreated(functionName, runtime, architecture, memorySize) {
    const zipBuffer = fs.readFileSync(`runtimes/${runtime}/function.zip`);
    
    try {
        const createCommand = new CreateFunctionCommand({
            FunctionName: functionName,
            Runtime: "nodejs20.x",
            Role: `arn:aws:iam::${ACCOUNT_ID}:role/lambda-exec-role`,
            Handler: "index.handler",
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
            
            if (response.Configuration.State === 'Active') {
                return;
            }
            
            if (response.Configuration.State === 'Failed') {
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
}

export async function invokeFunction(functionName) {
    const invokeCommand = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "RequestResponse"
    });
    
    const response = await lambdaClient.send(invokeCommand);
    
    const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log(`Invoked function ${functionName}:`, responsePayload);
    return responsePayload;
}

export async function deleteFunction(functionName) {
    const deleteCommand = new DeleteFunctionCommand({
        FunctionName: functionName,
    });

    await lambdaClient.send(deleteCommand);
    console.log(`Deleted function: ${functionName}`);
}
