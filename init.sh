REGION=$(aws configure get region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ECR
aws ecr create-repository \
  --repository-name lambda-benchmark \
  --image-tag-mutability MUTABLE \
  --region eu-central-1

# S3
aws s3api create-bucket \
  --bucket lambda-benchmark-packages \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

# Lambda role
aws iam create-role \
  --role-name lambda-exec-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
aws iam attach-role-policy \
  --role-name lambda-exec-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# GitHub Actions user
aws iam create-user --user-name github-actions-lambda-benchmark
aws iam put-user-policy --user-name github-actions-lambda-benchmark --policy-name lambda-benchmark-policy --policy-document '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::lambda-benchmark-packages",
        "arn:aws:s3:::lambda-benchmark-packages/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:'"$REGION"':'"$ACCOUNT_ID"':repository/lambda-benchmark"
    }
  ]
}'
aws iam create-access-key --user-name github-actions-lambda-benchmark