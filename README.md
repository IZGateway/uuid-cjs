# @izgateway/uuid-cjs


A CommonJS (CJS) compatible full replacement for [uuid](https://github.com/uuidjs/uuid) v14+,
for applications that cannot yet consume the ESM-only uuid package directly.

---

## Why Does This Package Exist?

### The Problem

Starting with **uuid v12**, the uuid package dropped CommonJS support and became
**ESM-only**. This means any package that uses `require('uuid')` — rather than
`import` — will crash at runtime if uuid is upgraded to v12 or later.

Several widely-used libraries in NextJS applications fall into this category.
The most significant is **next-auth v4**, which contains:

```js
// node_modules/next-auth/jwt/index.js
var _uuid = require("uuid");
// ...
setJti((0, _uuid.v4)())
```

Because `require()` cannot load an ESM module, upgrading uuid to v14 causes
next-auth v4 to fail at runtime with a module-not-found or ERR_REQUIRE_ESM error.

### The Security Driver

uuid v14 fixes a buffer bounds vulnerability
([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)) in the
`v3`, `v5`, and `v6` APIs when a caller passes an explicit output buffer. Security
policy may require all CVEs to be remediated regardless of whether the vulnerable code
path is reachable in a given application. This means applications must resolve to
uuid v14 even when upstream libraries like next-auth v4 are not yet compatible with it.

### The Migration Blocker

The proper long-term fix is to migrate from next-auth v4 to **next-auth v5**, which
supports uuid v14. However, next-auth v5 requires migrating a Next.js application
from the **Pages Router** to the **App Router** — a significant, non-trivial
refactoring effort. This package bridges the gap, allowing applications to satisfy
the CVE requirement immediately while the App Router migration is planned and executed.

### The Solution

This package provides a complete CJS module implementing the full uuid@14 API surface
using only **Node.js built-in `crypto`**. No uuid dependency. No ESM. The v4
implementation delegates to `crypto.randomUUID()`, which is:

- Available natively since Node 14.17.0 (no polyfill needed)
- FIPS-compliant when the Node runtime is running in FIPS mode
- Cryptographically equivalent to uuid v4's implementation (uuid v14 itself calls
  `crypto.randomUUID()` internally for its v4 implementation)

The result is a true drop-in replacement that clears the CVE without any behavior change.

---

## What This Package Provides

A complete, drop-in CJS replacement for uuid@14. All APIs are implemented using
Node.js built-in `crypto` — no external dependencies.

| Export | Behavior |
|---|---|
| `v1()` | Time-based UUID (random node ID + clock sequence via `crypto.randomBytes`) |
| `v3(name, namespace)` | Namespace UUID using MD5 via `crypto.createHash('md5')` |
| `v4()` | Random UUID via `crypto.randomUUID()` |
| `v5(name, namespace)` | Namespace UUID using SHA-1 via `crypto.createHash('sha1')` |
| `v6()` | Reordered time-based UUID (sortable variant of v1) |
| `v7()` | Unix timestamp + random UUID (monotonically sortable) |
| `validate(str)` | Returns `true` if `str` is a valid UUID (any version, nil, or max) |
| `parse(str)` | Parses a UUID string to a `Uint8Array` |
| `stringify(arr)` | Converts a `Uint8Array` to a UUID string |
| `version(str)` | Returns the version number of a UUID string |
| `NIL` | The nil UUID: `00000000-0000-0000-0000-000000000000` |
| `MAX` | The max UUID: `ffffffff-ffff-ffff-ffff-ffffffffffff` |

---

## Requirements

- **Node.js ≥ 18** (`crypto.randomUUID()` available from Node 14.17.0; Node 18 recommended minimum)
- No runtime dependencies

---

## Installation

This package is published to **GitHub Packages** under the `@izgateway` scope.
Authentication is required to install it.

### 1. Configure npm to use GitHub Packages for `@izgateway`

Add or update `.npmrc` in your project root:

```
@izgateway:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

The `${NPM_TOKEN}` is read from the environment at install time — do not hardcode
a token in the file.

### 2. Install the package

```sh
npm install @izgateway/uuid-cjs
```

---

## Usage as a Direct Dependency

If your own code calls `require('uuid')`:

```js
const { v4, validate } = require('@izgateway/uuid-cjs');

const id = v4();          // e.g. "110e8400-e29b-41d4-a716-446655440000"
validate(id);             // true
validate('not-a-uuid');   // false
```

---

## Usage as an npm Override (CVE Remediation)

The primary use case is redirecting transitive `uuid` consumers (such as next-auth v4)
to this package via an **npm override** in `package.json`. Because this is a complete
API replacement, any consumer of uuid in the dependency tree is covered — not just
libraries that use `v4()`.

```json
{
  "overrides": {
    "uuid": "npm:@izgateway/uuid-cjs@^14.0.0"
  }
}
```

After adding the override, run `npm install`. Any package in the dependency tree that
calls `require('uuid')` will now resolve to this package instead of the vulnerable
upstream package, clearing the CVE from `npm audit` output.

### Verify the override is in effect

```sh
npm ls uuid
```

All entries in the tree should show `@izgateway/uuid-cjs` rather than a vulnerable
version of `uuid`.

---

## Version Channels

| dist-tag | Version format | When published | Stability |
|---|---|---|---|
| `latest` | `X.Y.Z` | On PR merge to `main` | Stable — use in production |
| `dev` | `X.Y.Z-dev` | On every PR push | Unstable — pre-merge testing only |

Pin to a release version in production:

```json
"@izgateway/uuid-cjs": "^14.0.0"
```

---

## Contributing and Release Process

This repository uses a `feature → main` branching model. Every merge to `main`
produces a release. Version bump type is controlled by a PR label:

| PR label | Version bump |
|---|---|
| *(none)* or `bump:patch` | Patch (default) |
| `bump:minor` | Minor |
| `bump:major` | Major |

See the [OpenSpec change](openspec/changes/uuid-cjs-shim/) for full design and
implementation specifications.
