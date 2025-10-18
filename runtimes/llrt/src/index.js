import { LambdaHandler } from '@awslabs/aws-lambda-llrt';

export const handler = LambdaHandler.create(async (event, context) => {
    return {
        message: "Hello from Lambda!"
    };
});
