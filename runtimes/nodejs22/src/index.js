module.exports.handler = async (event) => {
    const input = JSON.parse(event);
    const numbers = input.numbers;

    if (numbers.length === 0) {
        throw new Error("Array cannot be empty");
    }

    let min = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] < min) {
            min = numbers[i];
        }
    }

    const normalized = new Array(numbers.length);
    for (let i = 0; i < numbers.length; i++) {
        normalized[i] = numbers[i] - min;
    }

    const output = {
        numbers: normalized,
        min: min
    };

    return JSON.stringify(output);
};