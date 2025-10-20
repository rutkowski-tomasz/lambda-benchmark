Work in progress

[Live results](https://rutkowski-tomasz.github.io/lambda-benchmark/)

# 📊 lambda-benchmark

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

## 🔎 analysis.js
Query CloudWatch REPORT logs for each function to extract cold start and execution times data.

## 📢 publish.js
Get results and publish to github pages.
 
# 🛣️ Roadmap

1. Image packageType returns error
1. Estimate cost for running benchmark 'arm64': 0.0000133334, 'x86_64': 0.0000166667,
1. Implement benchmarked logic deserialize, get min/max/avg of positive numbers, serialize to JSON
  - dotnet8
  - llrt
  - nodejs22
1. Implement dotnet8 aot on AL2
1. Implement dotnet8 aot on AL2023
1. Generating github page
