Work in progress

[Live results](https://rutkowski-tomasz.github.io/lambda-benchmark/)

# 📊 lambda-benchmark

Weekly benchmarks to drive your AWS Lambda decisions

Motivation:
Up to date benchmark results
Analyzing cold start and execution times
Scenario: deserialize JSON array, get min/max/avg of positive numbers, serialize to JSON
Useful graphs to compare results

## 🚀 run.js

To setup prerequisites `./init.sh`
1. Create deployable ZIP package in Docker (packageType='zip')
    1. (if aplicable) Build/publish deployable files (applicable for compiled languages)
    1. Package deployable files into ZIP
1. Create custom image on top of [AWS lambda images](https://gallery.ecr.aws/lambda) with embedded ZIP package (packageType='image')
1. Push custom image to ECR
1. Create lambda functions with all configurations (3 runtimes, 2 package types, 2 architectures arm64/x86_64, 4 memory sizes 128/256/512/1024) 
1. Invoke each lambda functions 10 times
  1. Update configuration to force cold start
  1. Invoke

## 🔎 collect.js
Query CloudWatch REPORT logs for each function to extract cold start and execution times data.
 
# 🛣️ Roadmap

1. Fix packageSizes
1. Transform init.sh to OpenTofu
1. Runtimes
  - Rust
  - Go
  - Nodejs (16, 18, 20)
  - Python (3.9, 3.10, 3.11, 3.12, 3.13)
  - Shell
  - Java
  - C++
  - dotnet6 (all), dotnet8 on AL2


Todo instructions:
pnpm run package dotnet9_aot_al2023 arm64
conventions for runtimes