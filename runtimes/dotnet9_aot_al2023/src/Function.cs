using Amazon.Lambda.Core;
using Amazon.Lambda.RuntimeSupport;
using Amazon.Lambda.Serialization.SystemTextJson;
using System.Text.Json.Serialization;

namespace LambdaBenchmark;

public class Function
{
    private static async Task Main()
    {
        Func<int[], ILambdaContext, int[]> handler = FunctionHandler;
        await LambdaBootstrapBuilder.Create(handler, new SourceGeneratorLambdaJsonSerializer<LambdaFunctionJsonSerializerContext>())
            .Build()
            .RunAsync();
    }

    public static int[] FunctionHandler(int[] numbers, ILambdaContext context)
    {
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

        return normalized;
    }
}

[JsonSerializable(typeof(int[]))]
public partial class LambdaFunctionJsonSerializerContext : JsonSerializerContext
{
}