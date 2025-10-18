using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace LambdaBenchmark;

public class Function
{
    public object FunctionHandler(object input, ILambdaContext context)
    {
        return new
        {
            message = "Hello from Lambda!"
        };
    }
}
