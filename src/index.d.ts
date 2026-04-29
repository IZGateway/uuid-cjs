/**
 * CJS-compatible replacement for uuid@14, backed by Node built-in crypto.
 * Full API-compatible with uuid@14 for use in NextJS applications where
 * next-auth v4 requires CommonJS uuid.
 */

/** The nil UUID string (all zeros). */
export declare const NIL: string;

/** The max UUID string (all f's). */
export declare const MAX: string;

/**
 * Test a string to see if it is a valid UUID.
 * Returns false for non-string input without throwing.
 */
export declare function validate(str: unknown): boolean;

/**
 * Parse a UUID string into a Uint8Array of 16 bytes.
 * @throws {TypeError} if uuid is not a valid UUID string
 */
export declare function parse(uuid: string): Uint8Array;

/**
 * Convert a byte array to a UUID string.
 * @param arr  Array-like of at least offset+16 bytes
 * @param offset  Byte offset into arr (default 0)
 * @throws {TypeError} if arr does not have enough bytes
 */
export declare function stringify(arr: ArrayLike<number>, offset?: number): string;

/**
 * Return the version number (1–7) of a UUID string.
 * @throws {TypeError} if uuid is not a valid UUID string
 */
export declare function version(uuid: string): number;

/** Options accepted by v1, v6, and v7 (reserved for future extension). */
export interface V1Options {
  [key: string]: unknown;
}

/**
 * Generate a time-based (version 1) UUID.
 * Uses a random node ID (multicast bit set) and monotonic clock sequence.
 */
export declare function v1(options?: V1Options, buf?: Uint8Array, offset?: number): string | Uint8Array;

/**
 * Generate a name-based (MD5, version 3) UUID.
 */
export declare function v3(name: string | Uint8Array, namespace: string | Uint8Array, buf?: Uint8Array, offset?: number): string | Uint8Array;

/**
 * Generate a random (version 4) UUID.
 */
export declare function v4(options?: Record<string, unknown>, buf?: Uint8Array, offset?: number): string | Uint8Array;

/**
 * Generate a name-based (SHA-1, version 5) UUID.
 */
export declare function v5(name: string | Uint8Array, namespace: string | Uint8Array, buf?: Uint8Array, offset?: number): string | Uint8Array;

/**
 * Generate a reordered time-based (version 6) UUID.
 * Lexicographic sort order equals chronological order.
 */
export declare function v6(options?: V1Options, buf?: Uint8Array, offset?: number): string | Uint8Array;

/**
 * Generate a Unix timestamp + random (version 7) UUID.
 * Lexicographic sort order equals chronological order.
 */
export declare function v7(options?: Record<string, unknown>, buf?: Uint8Array, offset?: number): string | Uint8Array;
