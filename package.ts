import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { type Architecture } from "./types.js";
import { execSync } from 'child_process';
import { getAwsConfig, getConfig } from './utils.js';

const s3Client = new S3Client();
const { region, s3Bucket, registryUrl } = await getAwsConfig();

const runtime = process.argv[2] as string;
const architecture = process.argv[3] as Architecture;
await main(runtime, architecture);

async function main(runtime: string, architecture: Architecture) {
    console.log(`[package] Packing ZIP package`);
    const zipPackage = await createZipPackage(runtime, architecture);

    console.log(`[package] Uploading ${zipPackage.path} to S3`);
    await uploadToS3(zipPackage.path);

    console.log(`[package] Creating docker image`);
    const image = await createAndPushImage(zipPackage.path, runtime, architecture);

    console.log(`[package] Logging in to ECR`);
    execSync(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registryUrl}`);

    console.log(`[package] Pushing ${image.tag} to ECR`);
    execSync(`docker push ${image.tag}`);

    if (process.env.GITHUB_OUTPUT) {
        console.log(`[package] Writing result to GitHub output`);
        const result = {
            runtime,
            architecture,
            zipSize: zipPackage.size,
            imageSize: image.size
        };
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${JSON.stringify(result)}\n`);
    }

    console.log(`[success] package size: ${formatSize(zipPackage.size)}, image size: ${formatSize(image.size)}`);
}

async function createZipPackage(runtime: string, architecture: Architecture): Promise<{ path: string, size: number }> {

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

async function uploadToS3(path: string): Promise<void> {

    const zipContent = fs.readFileSync(path);

    await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: path,
        Body: zipContent,
        ContentType: 'application/zip',
        StorageClass: 'STANDARD_IA',
        Metadata: {
            runtime,
            architecture,
            size: fs.statSync(path).size.toString()
        }
    }));
}

async function createAndPushImage(zipPackagePath: string, runtime: string, architecture: Architecture): Promise<{ tag: string, size: number }> {
    const config = await getConfig(runtime);
    const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const extractPath = zipPackagePath.slice(0, -4);

    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }
    
    execSync(`unzip ${zipPackagePath} -d ${extractPath}`);

    const tag = `${registryUrl}/lambda-benchmark:${runtime}-${architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${runtime} -f Dockerfile.custom_image --build-arg BASE_IMAGE=${config.baseImage} --build-arg HANDLER=${config.handler} --build-arg ARCHITECTURE=${architecture} -t ${tag}`;
    execSync(buildCommand);

    return { tag, size: parseInt(execSync(`docker inspect -f '{{ .Size }}' ${tag}`, { encoding: 'utf-8' }).trim()) };
}

function formatSize(bytes: number): string {
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
