using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

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
    public string FunctionHandler(string json, ILambdaContext context)
    {
        var input = JsonSerializer.Deserialize<Input>(json);
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

        return JsonSerializer.Serialize(output);
    }
}
