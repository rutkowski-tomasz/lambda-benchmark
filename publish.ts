import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { type Architecture } from "./types.js";
import { execSync } from 'child_process';
import { formatSize } from './utils.js';

const ACCOUNT_ID = "024853653660";
const REGION = "eu-central-1";
const S3_BUCKET = "lambda-benchmark-packages";
const REGISTRY_URL = `${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com`;

const s3Client = new S3Client({ region: REGION });

const runtime = process.argv[2] as string;
const architecture = process.argv[3] as Architecture;

console.log(`[publish] Packing ZIP package`);
const zipPackage = await pack(runtime, architecture);

console.log(`[publish] Uploading ${zipPackage.path} to S3`);
await uploadToS3(zipPackage.path);

console.log(`[publish] Creating docker image`);
const image = await createAndPushImage(runtime, architecture);

console.log(`[publish] Logging in to ECR`);
execSync(`aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${REGISTRY_URL}`);

console.log(`[publish] Pushing ${image.tag} to ECR`);
execSync(`docker push ${image.tag}`);

if (process.env.GITHUB_OUTPUT) {
    console.log(`[publish] Writing result to GitHub output`);
    const result = {
        runtime,
        architecture,
        zipSize: zipPackage.size,
        imageSize: image.size
    };
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify(result)}\n`);
}

console.log(`[success] package size: ${formatSize(zipPackage.size)}, image size: ${formatSize(image.size)}`);

export async function pack(runtime: string, architecture: Architecture): Promise<{ path: string, size: number }> {

    const path = `runtimes/${runtime}/function_${architecture}.zip`;
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }

    const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const imageTag = `${runtime}_${architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${runtime} --build-arg ARCHITECTURE=${architecture} -t ${imageTag}`;
    execSync(buildCommand);

    const dockerId = execSync(`docker create ${imageTag}`, { encoding: 'utf-8' }).trim();
    execSync(`docker cp ${dockerId}:/function.zip ${path}`);
    return { path, size: fs.statSync(path).size };
}

export async function uploadToS3(path: string): Promise<void> {

    const zipContent = fs.readFileSync(path);

    await s3Client.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: path,
        Body: zipContent,
        ContentType: 'application/zip',
        Metadata: {
            runtime,
            architecture,
            size: fs.statSync(path).size.toString()
        }
    }));
}

export async function createAndPushImage(runtime: string, architecture: Architecture): Promise<{ tag: string, size: number }> {
    const configFile = fs.readFileSync(`runtimes/${runtime}/config.json`, 'utf8');
    const config = JSON.parse(configFile);
    const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const extractPath = `runtimes/${runtime}/function_${architecture}`;

    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }
    
    execSync(`unzip runtimes/${runtime}/function_${architecture}.zip -d ${extractPath}`);

    const tag = `${REGISTRY_URL}/lambda-benchmark:${runtime}-${architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${runtime} -f Dockerfile.custom_image --build-arg BASE_IMAGE=${config.baseImage} --build-arg HANDLER=${config.handler} --build-arg ARCHITECTURE=${architecture} -t ${tag}`;
    execSync(buildCommand);

    return { tag, size: parseInt(execSync(`docker inspect -f '{{ .Size }}' ${tag}`, { encoding: 'utf-8' }).trim()) };
}