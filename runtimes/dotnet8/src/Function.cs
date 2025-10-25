using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

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
    public NormalizeOutput FunctionHandler(NormalizeInput input, ILambdaContext context)
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
