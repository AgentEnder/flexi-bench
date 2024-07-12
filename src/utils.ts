export function findCombinations<T>(variables: T[][]) {
  // Generates all possible combinations of the given variables.
  // e.g. findCombinations([[1, 2], [3, 4]]) => [[1, 3], [1, 4], [2, 3], [2, 4]]
  return variables.reduce(
    (acc, values) => {
      return acc.flatMap((accItem) => {
        return values.map((value) => {
          return [...accItem, value];
        });
      });
    },
    [[]] as Array<Array<T>>,
  );
}
