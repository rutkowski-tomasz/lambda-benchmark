using Amazon.Lambda.Core;
using Amazon.Lambda.RuntimeSupport;
using Amazon.Lambda.Serialization.SystemTextJson;
using System.Text.Json.Serialization;

namespace LambdaBenchmark;

public class Input
{
    public int[] Numbers { get; set; } = [];
}

public class Output
{
    [JsonPropertyName("inputNumbers")]
    public int[] InputNumbers { get; set; } = [];

    [JsonPropertyName("normalizedNumbers")]
    public int[] NormalizedNumbers { get; set; } = [];

    [JsonPropertyName("min")]
    public int Min { get; set; }
}

public class Function
{
    private static async Task Main()
    {
        Func<Input, ILambdaContext, Output> handler = FunctionHandler;
        
        await LambdaBootstrapBuilder.Create(handler, new SourceGeneratorLambdaJsonSerializer<LambdaFunctionJsonSerializerContext>())
            .Build()
            .RunAsync();
    }

    public static Output FunctionHandler(Input input, ILambdaContext context)
    {
        if (input.Numbers.Length == 0)
        {
            throw new ArgumentException("Array cannot be empty");
        }

        var min = input.Numbers.Min();
        var normalizedNumbers = new int[input.Numbers.Length];
        for (var i = 0; i < input.Numbers.Length; i++)
        {
            normalizedNumbers[i] = input.Numbers[i] - min;
        }

        return new Output
        {
            InputNumbers = input.Numbers,
            NormalizedNumbers = normalizedNumbers,
            Min = min
        };
    }
}

[JsonSerializable(typeof(Input))]
[JsonSerializable(typeof(Output))]
public partial class LambdaFunctionJsonSerializerContext : JsonSerializerContext
{
}