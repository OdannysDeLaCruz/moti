/** Recursively convert BigInt fields to strings for JSON serialization. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeBigInt) as unknown as T;
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = serializeBigInt((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return obj;
}
