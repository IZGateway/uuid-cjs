# Spec: Shim API

## Requirements

### Requirement: Package is a CommonJS module

The package MUST be loadable via `require('@izgateway/uuid-cjs')` in any Node.js
CommonJS context. The package MUST NOT use ES module syntax (`import`/`export`) in
its entry point. The `"main"` field in `package.json` MUST point to the CJS entry
point. The package MUST NOT declare `"type": "module"` in `package.json`.

#### Scenario: CJS consumer loads the package

- **WHEN** a CJS module calls `const uuid = require('@izgateway/uuid-cjs')`
- **THEN** the call succeeds and `uuid` is an object containing all exported functions
- **AND** no `ERR_REQUIRE_ESM` or module-not-found error is thrown

#### Scenario: next-auth v4 resolves uuid via npm override

- **WHEN** `package.json` contains `"overrides": { "uuid": "npm:@izgateway/uuid-cjs@^14.0.0" }`
- **AND** next-auth v4 internally calls `require('uuid')`
- **THEN** the require resolves to `@izgateway/uuid-cjs` without error

---

### Requirement: Zero npm dependencies

The package MUST declare zero entries in `"dependencies"` in `package.json`. All
implementation MUST rely solely on Node.js built-in modules.

#### Scenario: Package installs with no transitive dependencies

- **WHEN** a consumer runs `npm install @izgateway/uuid-cjs`
- **THEN** no packages other than `@izgateway/uuid-cjs` itself are added to `node_modules`

---

### Requirement: v4 — random UUID via crypto.randomUUID

The exported `v4()` function MUST return a new random UUID string on each call by
delegating to `require('crypto').randomUUID()`. It MUST accept an optional `options`
argument and an optional `buf`/`offset` argument matching the uuid@14 signature.
When `buf` is provided, the UUID bytes MUST be written into the buffer at `offset`
and the buffer returned. When no `buf` is provided, a lowercase hyphenated UUID string
MUST be returned.

#### Scenario: v4 returns a valid UUID string

- **WHEN** `v4()` is called with no arguments
- **THEN** a string matching `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` is returned

#### Scenario: v4 called twice returns different values

- **WHEN** `v4()` is called twice in succession
- **THEN** the two returned strings are not equal

#### Scenario: v4 with buf writes bytes into buffer

- **WHEN** `v4({}, new Uint8Array(16), 0)` is called
- **THEN** a `Uint8Array` of length 16 is returned containing the UUID bytes
- **AND** byte index 6 has its high nibble equal to `0x40` (version 4)
- **AND** byte index 8 has its high two bits equal to `0b10` (variant 1)

---

### Requirement: v4 is FIPS-compliant

`v4()` MUST use `crypto.randomUUID()` as its random source. When the Node.js runtime
is running in FIPS mode, `crypto.randomUUID()` uses the FIPS-approved DRBG and
`v4()` MUST continue to function correctly.

#### Scenario: v4 works in FIPS mode

- **WHEN** Node.js is started with `--enable-fips` or OpenSSL FIPS mode is active
- **THEN** `v4()` returns a valid UUID string without throwing

---

### Requirement: v1 — time-based UUID

The exported `v1()` function MUST return a time-based UUID (RFC 4122 version 1).
The node ID and clock sequence MUST be initialised once per process using
`crypto.randomBytes()`. The timestamp MUST be derived from the system clock.
The function MUST accept optional `options` and `buf`/`offset` arguments matching
the uuid@14 signature.

#### Scenario: v1 returns a version-1 UUID

- **WHEN** `v1()` is called with no arguments
- **THEN** a string matching the UUID format is returned
- **AND** the version nibble (character 15) equals `'1'`

#### Scenario: Successive v1 calls are monotonically increasing

- **WHEN** `v1()` is called twice within the same millisecond
- **THEN** the clock sequence is incremented so that the second UUID sorts after the first

---

### Requirement: v3 — namespace UUID using MD5

The exported `v3(name, namespace)` function MUST return a namespace-based UUID using
MD5 hashing via `require('crypto').createHash('md5')`. Outputs MUST be
format-identical to uuid@14's v3 for the same `name` and `namespace` inputs.
The function MUST accept `name` as a string or `Uint8Array`, and `namespace` as a
UUID string or `Uint8Array`.

#### Scenario: v3 matches uuid@14 output for known input

- **WHEN** `v3('hello', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')` is called
- **THEN** the returned string equals `'0bacede4-4014-3f9d-b720-173f68a1c933'`

#### Scenario: v3 version nibble is 3

- **WHEN** `v3(name, namespace)` is called with any valid inputs
- **THEN** the version nibble (character 15) of the returned string equals `'3'`

---

### Requirement: v5 — namespace UUID using SHA-1

The exported `v5(name, namespace)` function MUST return a namespace-based UUID using
SHA-1 hashing via `require('crypto').createHash('sha1')`. Outputs MUST be
format-identical to uuid@14's v5 for the same `name` and `namespace` inputs.
The function MUST accept `name` as a string or `Uint8Array`, and `namespace` as a
UUID string or `Uint8Array`.

#### Scenario: v5 matches uuid@14 output for known input

- **WHEN** `v5('hello', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')` is called
- **THEN** the returned string equals `'9342d47a-1bab-5709-9869-c840b2eac501'`

#### Scenario: v5 version nibble is 5

- **WHEN** `v5(name, namespace)` is called with any valid inputs
- **THEN** the version nibble (character 15) of the returned string equals `'5'`

---

### Requirement: v6 — reordered time-based UUID

The exported `v6()` function MUST return a reordered time-based UUID (RFC 9562
version 6), which is a sortable variant of v1. The timestamp field ordering MUST
place the most-significant time bits first so that lexicographic sort equals
chronological sort. The function MUST accept optional `options` and `buf`/`offset`
arguments matching the uuid@14 signature.

#### Scenario: v6 returns a version-6 UUID

- **WHEN** `v6()` is called with no arguments
- **THEN** a string matching the UUID format is returned
- **AND** the version nibble (character 15) equals `'6'`

#### Scenario: Successive v6 UUIDs sort chronologically

- **WHEN** `v6()` is called twice with a time gap between calls
- **THEN** the first returned string is lexicographically less than the second

---

### Requirement: v7 — Unix timestamp + random UUID

The exported `v7()` function MUST return a UUID (RFC 9562 version 7) with a
48-bit Unix timestamp prefix in milliseconds followed by random bytes from
`crypto.randomBytes()`. The function MUST accept optional `options` and
`buf`/`offset` arguments matching the uuid@14 signature.

#### Scenario: v7 returns a version-7 UUID

- **WHEN** `v7()` is called with no arguments
- **THEN** a string matching the UUID format is returned
- **AND** the version nibble (character 15) equals `'7'`

#### Scenario: v7 UUIDs are monotonically sortable

- **WHEN** `v7()` is called twice with at least 1 ms between calls
- **THEN** the first returned string is lexicographically less than the second

---

### Requirement: validate — UUID string validation

The exported `validate(str)` function MUST return `true` if and only if `str` is a
syntactically valid UUID string in the standard hyphenated lowercase or uppercase
format, including the nil UUID and the max UUID. It MUST return `false` for any
non-string argument or malformed string.

#### Scenario: validate returns true for a valid v4 UUID

- **WHEN** `validate('110e8400-e29b-41d4-a716-446655440000')` is called
- **THEN** `true` is returned

#### Scenario: validate returns true for nil UUID

- **WHEN** `validate('00000000-0000-0000-0000-000000000000')` is called
- **THEN** `true` is returned

#### Scenario: validate returns true for max UUID

- **WHEN** `validate('ffffffff-ffff-ffff-ffff-ffffffffffff')` is called
- **THEN** `true` is returned

#### Scenario: validate returns false for non-UUID string

- **WHEN** `validate('not-a-uuid')` is called
- **THEN** `false` is returned

#### Scenario: validate returns false for non-string input

- **WHEN** `validate(null)`, `validate(undefined)`, or `validate(123)` is called
- **THEN** `false` is returned without throwing

---

### Requirement: parse — UUID string to Uint8Array

The exported `parse(str)` function MUST convert a valid UUID string to a `Uint8Array`
of 16 bytes. It MUST throw a `TypeError` if `str` is not a valid UUID string.
The output MUST be byte-for-byte identical to uuid@14's `parse()` for the same input.

#### Scenario: parse converts a UUID string to bytes

- **WHEN** `parse('6ba7b810-9dad-11d1-80b4-00c04fd430c8')` is called
- **THEN** a `Uint8Array` of length 16 is returned with the correct byte values

#### Scenario: parse throws on invalid input

- **WHEN** `parse('not-a-uuid')` is called
- **THEN** a `TypeError` is thrown

---

### Requirement: stringify — Uint8Array to UUID string

The exported `stringify(arr, offset)` function MUST convert a `Uint8Array` (or
compatible array-like) of at least 16 bytes to a lowercase hyphenated UUID string.
It MUST throw a `TypeError` if the input is not a valid 16-byte array. The output
MUST be format-identical to uuid@14's `stringify()` for the same input.

#### Scenario: stringify round-trips with parse

- **WHEN** a UUID string `s` is parsed with `parse(s)` and then passed to `stringify()`
- **THEN** the result equals `s` (case-normalised to lowercase)

---

### Requirement: version — extract UUID version number

The exported `version(str)` function MUST return the integer version number (1–7)
encoded in the UUID string. It MUST throw a `TypeError` if `str` is not a valid UUID.

#### Scenario: version returns correct version for v4 UUID

- **WHEN** `version('110e8400-e29b-41d4-a716-446655440000')` is called
- **THEN** `4` is returned

---

### Requirement: NIL and MAX constants

The package MUST export `NIL` as the string `'00000000-0000-0000-0000-000000000000'`
and `MAX` as the string `'ffffffff-ffff-ffff-ffff-ffffffffffff'`.

#### Scenario: NIL constant has correct value

- **WHEN** the `NIL` export is accessed
- **THEN** its value is `'00000000-0000-0000-0000-000000000000'`

#### Scenario: MAX constant has correct value

- **WHEN** the `MAX` export is accessed
- **THEN** its value is `'ffffffff-ffff-ffff-ffff-ffffffffffff'`

---

### Requirement: TypeScript declarations

The package MUST include a `index.d.ts` (or equivalent) TypeScript declaration file
referenced by the `"types"` field in `package.json`. Declarations MUST cover all
exported functions and constants with accurate parameter and return types.

#### Scenario: TypeScript consumer can import with types

- **WHEN** a TypeScript project adds `@izgateway/uuid-cjs` as a dependency
- **THEN** `tsc` resolves the type declarations without error
- **AND** `v4()`, `validate()`, `parse()`, `stringify()`, `version()`, `NIL`, and `MAX`
  are all typed correctly

---

### Requirement: Node.js version compatibility

The package MUST function correctly on Node.js ≥ 18. It MUST NOT use any API
introduced after Node 18.

#### Scenario: Package loads and all exports work on Node 18

- **WHEN** the package is loaded in a Node 18 process
- **THEN** all exported functions (`v1`–`v7`, `validate`, `parse`, `stringify`,
  `version`) execute without error and `NIL`/`MAX` are accessible
