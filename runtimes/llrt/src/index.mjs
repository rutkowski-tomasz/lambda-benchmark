export const handler = async (event, context) => {
    const numbers = JSON.parse(event);

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

    return JSON.stringify(normalized);
};
