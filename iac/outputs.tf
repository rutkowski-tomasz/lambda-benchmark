output "ecr_repository_url" {
  value = aws_ecr_repository.lambda_benchmark.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.lambda_packages.id
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_exec.arn
}

output "github_actions_access_key_id" {
  value     = aws_iam_access_key.github_actions.id
  sensitive = true
}

output "github_actions_secret_access_key" {
  value     = aws_iam_access_key.github_actions.secret
  sensitive = true
}