import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { STSClient } from '@aws-sdk/client-sts';

const stsClient = new STSClient({});

export async function getAwsConfig() {
    const [identity, region] = await Promise.all([
        stsClient.send(new GetCallerIdentityCommand({})),
        stsClient.config.region()
    ]);

    return { accountId: identity.Account!, region: region };
}
