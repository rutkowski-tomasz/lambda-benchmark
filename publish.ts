import fs from 'fs';
import { createCustomImage, loginToEcr, pack } from "./operations.js";
import { type Architecture, type PublishConfiguration } from "./types.js";

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";

const runtime = process.argv[2] as string;
const architecture = process.argv[3] as Architecture;
const publishConfiguration: PublishConfiguration = { runtime, architecture };

console.log(`Packing ${runtime} ${architecture} ZIP package...`);
const zipSize = await pack(publishConfiguration);
console.log(`ZIP package size: ${zipSize.size}`);

console.log(`Logging in to ECR...`);
const registryUrl = await loginToEcr(REGION, ACCOUNT_ID);

console.log(`Creating image...`);
const imageSize = await createCustomImage(publishConfiguration, registryUrl);
console.log(`Image size: ${imageSize.size}`);

const result = {
    runtime,
    architecture,
    zipSize: zipSize.size,
    imageSize: imageSize.size
};

if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify(result)}\n`);
}
