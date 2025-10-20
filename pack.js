import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function packAll(runtimes, architectures) {

    console.log(`Packing ${runtimes.length * architectures.length} functions...`);
    await Promise.all(
        runtimes.map(runtime =>
            architectures.map(architecture =>
                pack(runtime, architecture)
            )
        )
    );
}

export async function pack(runtime, architecture) {

    const packPath = `runtimes/${runtime}/function_${architecture}.zip`;
    if (fs.existsSync(packPath)) {
        fs.unlinkSync(packPath);
    }

    const platform = architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64';
    const imageTag = `${runtime}_${architecture}`;
    const buildCommand = `docker build --platform ${platform} runtimes/${runtime} --build-arg ARCHITECTURE=${architecture} -t ${imageTag}`;

    try {
        await execAsync(buildCommand);
    } catch (error) {
        console.error(`[error] build command failed: ${buildCommand}`);
        throw error;
    }

    const dockerId = (await execAsync(`docker create ${imageTag}`)).stdout.trim();
    const copyCommand = `docker cp ${dockerId}:/function.zip ${packPath}`;

    try {
        await execAsync(copyCommand);
    } catch (error) {
        console.error(`[error] copy command failed: ${copyCommand}`);
    }

    const size = Math.round(fs.statSync(packPath).size / 1024, 1);
    console.log(`[success] Packed ${runtime} for architecture ${architecture} (${packPath}, ${size}kb)`);
}
