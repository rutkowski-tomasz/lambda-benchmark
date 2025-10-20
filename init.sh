aws ecr create-repository \
  --repository-name lambda-benchmark \
  --image-tag-mutability MUTABLE \
  --region eu-central-1

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
