import { createOrUpdateFunctionCode} from './lambda-utils.js';

export async function deployAll(runtimes, architectures, memorySizes) {

    console.log(`Deploying ${runtimes.length * architectures.length * memorySizes.length} functions...`);
    await Promise.all(
        runtimes.flatMap(runtime =>
            architectures.flatMap(architecture =>
                memorySizes.map(memorySize => deploy(runtime, architecture, memorySize))
            )
        )
    );
}

export async function deploy(runtime, architecture, memorySize) {
    await createOrUpdateFunctionCode(runtime, architecture, memorySize);
}