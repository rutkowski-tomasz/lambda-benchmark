using Amazon.Lambda.Core;
using Amazon.Lambda.RuntimeSupport;
using Amazon.Lambda.Serialization.SystemTextJson;
using Amazon.Lambda.APIGatewayEvents;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LambdaBenchmark;

public class Input
{
    public int[] Numbers { get; set; } = [];
}

public class Output
{
    public int[] InputNumbers { get; set; } = [];
    public int[] NormalizedNumbers { get; set; } = [];
    public int Min { get; set; }
}

public class Function
{
    private static async Task Main()
    {
        Func<APIGatewayProxyRequest, ILambdaContext, APIGatewayProxyResponse> handler = FunctionHandler;

        await LambdaBootstrapBuilder.Create(handler, new SourceGeneratorLambdaJsonSerializer<LambdaFunctionJsonSerializerContext>())
            .Build()
            .RunAsync();
    }

    public static APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        var input = JsonSerializer.Deserialize(request.Body, LambdaFunctionJsonSerializerContext.Default.Input);

        if (input!.Numbers.Length == 0)
        {
            throw new ArgumentException("Array cannot be empty");
        }

        var min = input.Numbers.Min();
        var normalizedNumbers = new int[input.Numbers.Length];
        for (var i = 0; i < input.Numbers.Length; i++)
        {
            normalizedNumbers[i] = input.Numbers[i] - min;
        }

        return new APIGatewayProxyResponse
        {
            StatusCode = 200,
            Body = JsonSerializer.Serialize(new Output
            {
                InputNumbers = input.Numbers,
                NormalizedNumbers = normalizedNumbers,
                Min = min
            }, LambdaFunctionJsonSerializerContext.Default.Output)
        };
    }
}

[JsonSerializable(typeof(Input))]
[JsonSerializable(typeof(Output))]
[JsonSerializable(typeof(APIGatewayProxyRequest))]
[JsonSerializable(typeof(APIGatewayProxyResponse))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
public partial class LambdaFunctionJsonSerializerContext : JsonSerializerContext
{
}