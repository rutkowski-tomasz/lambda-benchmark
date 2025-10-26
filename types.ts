export type Build = {
    runtime: string;
    architecture: Architecture;
};

export type Execute = {
    runtime: string;
    architecture: Architecture;
    memorySize: MemorySize;
    packageType: PackageType;
};

export type Architecture = 'arm64' | 'x86_64';
export type PackageType = 'zip' | 'image';
export type MemorySize = 128 | 256 | 512 | 1024;

export type Analysis = {
    runtime: string;
    packageType: PackageType;
    architecture: Architecture;
    memorySize: MemorySize;
    executions: any[];
};

export type Benchmark = {
    packageSizes: PackageSize[];
    analysis: Analysis[];
}

export type PackageSize = {
    runtime: string;
    architecture: Architecture;
    packageType: PackageType;
    size: number;
}

export type ExecutionData = {
    initDuration: number;
    duration: number;
    billedDuration: number;
    memoryUsed: number;
}

export type Input = {
    numbers: number[];
}

export type Output = {
    inputNumbers: number[];
    normalizedNumbers: number[];
    min: number;
}