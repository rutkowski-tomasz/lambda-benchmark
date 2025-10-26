using Amazon.Lambda.Core;
using System.Text.Json.Serialization;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

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
    public Output FunctionHandler(Input input, ILambdaContext context)
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
