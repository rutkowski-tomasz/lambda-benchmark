variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "repository_name" {
  description = "ECR repository name"
  type        = string
  default     = "lambda-benchmark"
}

variable "bucket_name" {
  description = "S3 bucket name"
  type        = string
  default     = "lambda-benchmark-packages"
}