import fs from "fs";
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { STSClient } from '@aws-sdk/client-sts';
import type { Config } from "./types.js";

const stsClient = new STSClient({});

export async function getAwsConfig() {
    const [identity, region] = await Promise.all([
        stsClient.send(new GetCallerIdentityCommand({})),
        stsClient.config.region()
    ]);
    const accountId = identity.Account!;

    return {
        accountId,
        region,
        s3Bucket: "lambda-benchmark-packages",
        registryUrl: `${accountId}.dkr.ecr.${region}.amazonaws.com`
    };
}

export async function getConfig(runtime: string): Promise<Config> {
    return JSON.parse(fs.readFileSync(`runtimes/${runtime}/config.json`, 'utf8'));
}