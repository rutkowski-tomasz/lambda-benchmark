using Amazon.Lambda.Core;
using Amazon.Lambda.RuntimeSupport;
using Amazon.Lambda.Serialization.SystemTextJson;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LambdaBenchmark;

public class Input
{
    public int[] numbers { get; set; } = Array.Empty<int>();
}

public class Output
{
    public int[] numbers { get; set; } = Array.Empty<int>();
    public int min { get; set; }
}

public class Function
{
    private static async Task Main()
    {
        Func<string, ILambdaContext, string> handler = FunctionHandler;
        await LambdaBootstrapBuilder.Create(handler, new SourceGeneratorLambdaJsonSerializer<LambdaFunctionJsonSerializerContext>())
            .Build()
            .RunAsync();
    }

    public static string FunctionHandler(string json, ILambdaContext context)
    {
        var input = JsonSerializer.Deserialize(json, LambdaFunctionJsonSerializerContext.Default.Input);
        var numbers = input!.numbers;

        if (numbers.Length == 0)
        {
            throw new ArgumentException("Array cannot be empty");
        }

        var min = numbers[0];
        for (var i = 1; i < numbers.Length; i++)
        {
            if (numbers[i] < min)
                min = numbers[i];
        }

        var normalized = new int[numbers.Length];
        for (var i = 0; i < numbers.Length; i++)
        {
            normalized[i] = numbers[i] - min;
        }

        var output = new Output
        {
            numbers = normalized,
            min = min
        };

        return JsonSerializer.Serialize(output, LambdaFunctionJsonSerializerContext.Default.Output);
    }
}

[JsonSerializable(typeof(Input))]
[JsonSerializable(typeof(Output))]
public partial class LambdaFunctionJsonSerializerContext : JsonSerializerContext
{
}