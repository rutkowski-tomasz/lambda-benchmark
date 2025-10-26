import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createCustomImage, loginToEcr, pack } from "./operations.js";
import { type Architecture, type PublishConfiguration } from "./types.js";

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";
const S3_BUCKET = "lambda-benchmark-packages";

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


// Upload ZIP to S3
const zipPath = `runtimes/${runtime}/function_${architecture}.zip`;
const s3Key = `packages/${runtime}/function_${architecture}.zip`;

console.log(`Uploading ZIP to S3: s3://${S3_BUCKET}/${s3Key}`);
const s3Client = new S3Client({ region: REGION });
const zipContent = fs.readFileSync(zipPath);

await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: zipContent,
    ContentType: 'application/zip',
    Metadata: {
        runtime,
        architecture,
        size: zipSize.size.toString()
    }
}));

console.log(`ZIP uploaded successfully`);

const result = {
    runtime,
    architecture,
    zipSize: zipSize.size,
    imageSize: imageSize.size
};

if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify(result)}\n`);
}
