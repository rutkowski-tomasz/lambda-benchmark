using Amazon.Lambda.Core;
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace LambdaBenchmark;

public class Function
{
    public string FunctionHandler(string input, ILambdaContext context)
    {
        return "Hello from Lambda!";
    }
}
