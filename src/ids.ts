/**
 * Generates a random id, preferring the standard `crypto.randomUUID()`
 * (available in every browser JupyterLab supports) and falling back to a
 * manual RFC 4122 v4 generator only where it's absent, such as some test
 * runners' `crypto` shims.
 */
export function generateId(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
