export type Spec = {
  runtime: string;
  architecture: Architecture;
  memorySize: MemorySize;
  packageType: PackageType;
};

export type Architecture = 'arm64' | 'x86_64';
export type PackageType = 'zip' | 'image';
export type MemorySize = 128 | 256 | 512 | 1024;

export type ExecutionGroup = {
  runtime: string;
  packageType: PackageType;
  architecture: Architecture;
  memorySize: MemorySize;
  executions: Execution[];
};

export type Execution = {
  initDuration: number;
  duration: number;
  billedDuration: number;
  memoryUsed: number;
}

export type PackageSize = {
  runtime: string;
  architecture: Architecture;
  packageType: PackageType;
  size: number;
}

export type Input = {
  numbers: number[];
}

export type Output = {
  inputNumbers: number[];
  normalizedNumbers: number[];
  min: number;
}