## Why

As a developer maintaining IZGateway Node.js applications, I need a CJS-compatible
full replacement for uuid that uses Node-native crypto so that apps pinned to CJS
runtimes (e.g., next-auth@4) can be upgraded past the uuid CVE (GHSA-w5hq-g745-h8pq)
without waiting for upstream library migrations to ESM.

uuid@12+ is ESM-only and incompatible with `require()`. next-auth@4 and other CJS
libraries use `require('uuid')`, making a direct override to uuid@14 a runtime failure.
Federal security policy requires all CVEs to be remediated regardless of exploitability,
creating an urgent blocker for IZGateway applications that cannot yet migrate to
next-auth@5 (which requires a Next.js App Router migration).

Because the additional implementation effort is minimal when using Node-native crypto
(no external dependencies needed for MD5, SHA-1, or random bytes), the package
implements the **complete uuid API surface** rather than a subset, making it a true
drop-in CJS replacement usable by any consumer — not just next-auth.

## What Changes

- **New npm package** `@izgateway/uuid-cjs` published to GitHub Packages, implementing
  the full uuid API (`v1`–`v7`, `validate`, `parse`, `stringify`, `version`, `NIL`,
  `MAX`) as a CJS module backed entirely by Node built-in `crypto` — no uuid dependency,
  no ESM.
- **New GitHub repository** `IZGateway/uuid-cjs` (public) to host the package so it
  can be consumed by multiple IZGateway applications.
- **CI/CD workflow** following the `feature → main` PR-label-driven pattern established
  in `izg-dependency-scripts`: dev publish on PR lifecycle, release on merge to `main`,
  Git version tags (`vX.Y.Z` + floating `vX`).

## Capabilities

### New Capabilities

- `shim-api`: CJS module implementing the full uuid@14 API surface using only Node
  built-in `crypto` — `v1()`, `v3()`, `v4()`, `v5()`, `v6()`, `v7()`, `validate()`,
  `parse()`, `stringify()`, `version()`, `NIL`, and `MAX`. No uuid dependency, no ESM.
- `ci-publish-workflow`: GitHub Actions `ci.yml` implementing PR-label-driven dev
  publish (`X.Y.Z-dev`, `--force --tag dev`) and release on merge to `main`
  (`npm version`, commit `[skip ci]`, publish `@latest`, Git tags).

### Modified Capabilities

_(none — new repository)_

## Impact

- **Consumers**: `izg-configuration-console` (and any future IZGateway Node app) adds
  `@izgateway/uuid-cjs` as a direct dependency and sets an npm override so that
  `require('uuid')` inside next-auth@4 resolves to this package, clearing the
  GHSA-w5hq-g745-h8pq CVE. Any other CJS consumer of uuid also benefits without
  code changes.
- **Node requirement**: Node ≥ 18 (uses `crypto.randomUUID()`, `crypto.createHash()`,
  and `crypto.randomBytes()` — all available from Node 15+; Node 18 is the IZGateway
  minimum; Node 24 is the current base image version).
- **Behavioral compatibility**: All outputs must be format-identical to uuid@14 for
  the same inputs. The v3/v5 hash-based APIs use `crypto.createHash('md5'/'sha1')`.
  The v1/v6 time-based APIs use `crypto.randomBytes()` for the node ID and clock
  sequence on first call.
- **No runtime dependency**: The package has zero npm dependencies.
