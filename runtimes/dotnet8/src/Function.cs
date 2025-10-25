using Amazon.Lambda.Core;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace LambdaBenchmark;

public class Function
{
    public string FunctionHandler(string json, ILambdaContext context)
    {
        int[] numbers = JsonSerializer.Deserialize<int[]>(json)!;

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

        return JsonSerializer.Serialize(normalized);
    }
}
