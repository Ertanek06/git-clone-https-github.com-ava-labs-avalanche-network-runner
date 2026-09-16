export const jsonParse = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
export const jsonString = (value) => JSON.stringify(value ?? {});
