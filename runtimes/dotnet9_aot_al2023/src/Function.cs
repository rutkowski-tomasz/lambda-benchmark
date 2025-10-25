using Amazon.Lambda.Core;
using Amazon.Lambda.RuntimeSupport;
using Amazon.Lambda.Serialization.SystemTextJson;
using System.Text.Json.Serialization;

namespace LambdaBenchmark;

public class NormalizeInput
{
    public int[] numbers { get; set; } = Array.Empty<int>();
}

public class NormalizeOutput
{
    public int[] numbers { get; set; } = Array.Empty<int>();
    public int min { get; set; }
}

public class Function
{
    private static async Task Main()
    {
        Func<NormalizeInput, ILambdaContext, NormalizeOutput> handler = FunctionHandler;
        await LambdaBootstrapBuilder.Create(handler, new SourceGeneratorLambdaJsonSerializer<LambdaFunctionJsonSerializerContext>())
            .Build()
            .RunAsync();
    }

    public static NormalizeOutput FunctionHandler(NormalizeInput input, ILambdaContext context)
    {
        int[] numbers = input.numbers;

        if (numbers.Length == 0)
        {
            throw new ArgumentException("Array cannot be empty");
        }

        int min = numbers[0];
        for (int i = 1; i < numbers.Length; i++)
        {
            if (numbers[i] < min)
                min = numbers[i];
        }

        int[] normalized = new int[numbers.Length];
        for (int i = 0; i < numbers.Length; i++)
        {
            normalized[i] = numbers[i] - min;
        }

        return new NormalizeOutput
        {
            numbers = normalized,
            min = min
        };
    }
}

[JsonSerializable(typeof(NormalizeInput))]
[JsonSerializable(typeof(NormalizeOutput))]
public partial class LambdaFunctionJsonSerializerContext : JsonSerializerContext
{
}