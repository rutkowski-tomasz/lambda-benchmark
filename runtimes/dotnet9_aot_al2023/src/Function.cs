using Amazon.Lambda.Core;
using Amazon.Lambda.RuntimeSupport;
using Amazon.Lambda.Serialization.SystemTextJson;
using System.Text.Json.Serialization;

namespace LambdaBenchmark;

public class Function
{
    private static async Task Main()
    {
        Func<ILambdaContext, Response> handler = FunctionHandler;
        await LambdaBootstrapBuilder.Create(handler, new SourceGeneratorLambdaJsonSerializer<LambdaFunctionJsonSerializerContext>())
            .Build()
            .RunAsync();
    }

    public static Response FunctionHandler(ILambdaContext context)
    {
        return new Response
        {
            message = "Hello from Lambda!"
        };
    }
}

public class Response
{
    public required string message { get; set; }
}

[JsonSerializable(typeof(Response))]
public partial class LambdaFunctionJsonSerializerContext : JsonSerializerContext
{
}