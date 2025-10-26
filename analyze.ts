import fs from 'fs';
import type { Analysis, Architecture, ExecutionData, MemorySize, PackageType } from './types.js';
import { CloudWatchLogsClient, DescribeLogGroupsCommand, StartQueryCommand } from '@aws-sdk/client-cloudwatch-logs';
import { GetQueryResultsCommand } from '@aws-sdk/client-cloudwatch-logs';

const hoursBack = 12;
const cloudWatchLogsClient = new CloudWatchLogsClient();

const executions = await queryCloudWatchLogs(hoursBack);
const analysis = groupExecutions(executions);

fs.writeFileSync('data/benchmark.json', JSON.stringify({ analysis }));

const pricePerMbMs: Record<Architecture, number> = {
    'arm64': 0.0000133334 / 1024 / 1000,
    'x86_64': 0.0000166667 / 1024 / 1000,
};
const estimatedCost = executions.reduce((acc, x) => acc + x.billedDuration * x.memorySize * pricePerMbMs[x.architecture], 0);
console.log(`[success] ${executions.length} executions for ${analysis.length} functions (cost: $${estimatedCost})`);

export async function queryCloudWatchLogs(hoursBack: number): Promise<ExecutionData[]> {
    console.log(`[analyze] Querying CloudWatch Logs for log groups`);
    
    const allResults: ExecutionData[] = [];
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
        console.log(`[analyze] Processing batch ${batchNumber} with ${logGroupNames.length} log groups`);

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

        const batchData = (results.results || []).map(row => {
            const functionName = row.find(field => field.field === '@entity.KeyAttributes.Name')?.value;
            const splits = functionName!.split('-');

            return {
                initDuration: parseFloat(row.find(field => field.field === '@initDuration')?.value!),
                duration: parseFloat(row.find(field => field.field === '@duration')?.value!),
                billedDuration: parseFloat(row.find(field => field.field === '@billedDuration')?.value!),
                memoryUsed: parseInt(row.find(field => field.field === '@maxMemoryUsed')?.value!) / 1_000_000,
                functionName: functionName!,
                runtime: splits[0]!,
                packageType: splits[1] as PackageType,
                architecture: splits[2] as Architecture,
                memorySize: parseInt(splits[3]!) as MemorySize,
            };
        });

        allResults.push(...batchData);
        nextToken = response.nextToken;
    } while (nextToken);

    return allResults;
}

export function groupExecutions(executions: ExecutionData[]): Analysis[] {
    const grouped = executions.reduce((acc, exec) => {
        const key = `${exec.runtime}-${exec.packageType}-${exec.architecture}-${exec.memorySize}`;
        
        if (!acc[key]) {
            acc[key] = {
                runtime: exec.runtime,
                packageType: exec.packageType,
                architecture: exec.architecture,
                memorySize: exec.memorySize,
                executions: []
            };
        }
        
        acc[key].executions.push({
            initDuration: exec.initDuration,
            duration: exec.duration,
            billedDuration: exec.billedDuration,
            memoryUsed: exec.memoryUsed
        });
        
        return acc;
    }, {} as Record<string, Analysis>);
    
    return Object.values(grouped);
}