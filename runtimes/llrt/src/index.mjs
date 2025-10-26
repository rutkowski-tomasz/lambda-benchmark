export const handler = async (event, context) => {
    const numbers = event.numbers;

    if (numbers.length === 0) {
        throw new Error("Array cannot be empty");
    }

    const min = Math.min(...numbers);
    const normalizedNumbers = new Array(numbers.length);
    for (let i = 0; i < numbers.length; i++) {
        normalizedNumbers[i] = numbers[i] - min;
    }

    return {
        inputNumbers: numbers,
        normalizedNumbers: normalizedNumbers,
        min: min
    };
};
