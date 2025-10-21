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

export type Result = {
    packageSizes: PackageSize[];
    analysis: Analysis[];
}

export type PackageSize = {
    runtime: string;
    architecture: Architecture;
    packageType: PackageType;
    size: number;
}