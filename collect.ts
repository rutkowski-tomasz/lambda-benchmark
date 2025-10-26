import fs from 'fs';
import type { ExecutionGroup, Architecture, MemorySize, PackageType } from './types.js';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, StartQueryCommand, GetQueryResultsCommand } from '@aws-sdk/client-cloudwatch-logs';

const hoursBack = 12;
const cloudWatchLogsClient = new CloudWatchLogsClient();

const executionGroups = await queryCloudWatchLogs(hoursBack);
fs.writeFileSync('data/benchmark.json', JSON.stringify(executionGroups));

const pricePerMbMs: Record<Architecture, number> = {
    'arm64': 0.0000133334 / 1024 / 1000,
    'x86_64': 0.0000166667 / 1024 / 1000,
};

const executionCount = executionGroups.reduce((sum, group) => sum + group.executions.length, 0);
const estimatedCost = executionGroups.reduce((sum, group) => 
    sum + group.executions.reduce((execSum, exec) => 
        execSum + exec.billedDuration * group.memorySize * pricePerMbMs[group.architecture], 0
    ), 0
);

console.log(`[success] ${executionCount} executions for ${executionGroups.length} functions (cost: $${estimatedCost.toFixed(4)})`);

export async function queryCloudWatchLogs(hoursBack: number): Promise<ExecutionGroup[]> {
    console.log(`[collect] Querying CloudWatch Logs for log groups`);
    
    const grouped: Record<string, ExecutionGroup> = {};
    
    let nextToken: string | undefined;
    let batchNumber = 0;
    
    do {
        const describeCommand = new DescribeLogGroupsCommand({
            logGroupNamePrefix: '/aws/lambda/',
            nextToken
        });
        const response = await cloudWatchLogsClient.send(describeCommand);
        const logGroupNames = response.logGroups?.map(lg => lg.logGroupName).filter(Boolean) as string[] || [];
        
        batchNumber++;
        console.log(`[collect] Processing batch ${batchNumber} with ${logGroupNames.length} log groups`);

        const startCommand = new StartQueryCommand({
            logGroupIdentifiers: logGroupNames,
            startTime: Math.floor((Date.now() - hoursBack * 60 * 60 * 1000) / 1000),
            endTime: Math.floor(Date.now() / 1000),
            queryString: "fields @timestamp, @duration, @initDuration, @billedDuration, @maxMemoryUsed, @entity.KeyAttributes.Name | filter @message like /^REPORT/ and ispresent(@initDuration) | sort @timestamp desc"
        });

        const { queryId } = await cloudWatchLogsClient.send(startCommand);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const resultsCommand = new GetQueryResultsCommand({ queryId });
        const results = await cloudWatchLogsClient.send(resultsCommand);

        for (const row of results.results || []) {
            const functionName = row.find(field => field.field === '@entity.KeyAttributes.Name')?.value!;
            const splits = functionName.split('-');

            const initDuration = parseFloat(row.find(field => field.field === '@initDuration')?.value!);
            const duration = parseFloat(row.find(field => field.field === '@duration')?.value!);
            const billedDuration = parseFloat(row.find(field => field.field === '@billedDuration')?.value!);
            const memoryUsed = parseInt(row.find(field => field.field === '@maxMemoryUsed')?.value!) / 1_000_000;
            const runtime = splits[0]!;
            const packageType = splits[1] as PackageType;
            const architecture = splits[2] as Architecture;
            const memorySize = parseInt(splits[3]!) as MemorySize;

            const key = `${runtime}-${packageType}-${architecture}-${memorySize}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    runtime,
                    packageType,
                    architecture,
                    memorySize,
                    executions: []
                };
            }
            
            grouped[key].executions.push({
                initDuration,
                duration,
                billedDuration,
                memoryUsed
            });
        }

        nextToken = response.nextToken;
    } while (nextToken);

    return Object.values(grouped);
}