## Context

`izg-configuration-console` (NextJS + next-auth v4) has two transitive uuid instances
flagged by CVE GHSA-w5hq-g745-h8pq: one pulled in directly and one bundled inside
`next-auth`. The official fix is uuid ≥ 14.0.0, but uuid 12+ is ESM-only and next-auth
v4 uses `require('uuid')` — so a plain version bump causes `ERR_REQUIRE_ESM` at runtime.
Migrating to next-auth v5 requires a full Next.js App Router rewrite and cannot be done
immediately. We need a bridge that (a) is CJS, (b) satisfies uuid ≥ 14.0.0, and (c) has
no new CVEs of its own. A second application (`izgw-transform`) has the same problem,
making a shared package worthwhile.

References: IGDD-2793, `proposal.md`, specs `shim-api`, `ci-publish-workflow`,
`secret-safety`.

---

## Goals / Non-Goals

**Goals:**
- Publish `@izgateway/uuid-cjs@14.x` to GitHub Packages as a CJS CommonJS module
- Implement the full uuid@14 API surface so consumers do not need code changes
- Use only Node.js built-in `crypto` — zero npm dependencies, no new CVEs possible
- Apply an npm `overrides` entry in `izg-configuration-console` to route all `require('uuid')` to this package
- Follow the IZ Gateway npm CICD pattern (PR-label-driven versioning, `feature → main`, `GITHUB_TOKEN` only)
- Provide TypeScript declarations so TypeScript consumers get accurate types

**Non-Goals:**
- Supporting browser environments (no `window.crypto` polyfill)
- ESM dual-mode packaging (consumers requiring ESM can use the official uuid package)
- Replacing the official uuid package in applications that are not blocked by next-auth's CJS requirement
- Implementing uuid namespace constants beyond `NIL` and `MAX`

---

## Decisions

### D1 — Full API replacement, not a minimal shim

**Decision:** Implement all exports of uuid@14 (`v1`–`v7`, `validate`, `parse`,
`stringify`, `version`, `NIL`, `MAX`).

**Rationale:** A minimal shim (v4-only) would break any consumer that calls other uuid
functions transitively. next-auth itself only calls `v4`, but an npm `overrides` entry
routes _all_ `require('uuid')` calls to our package, including calls from other
transitive dependencies. A full replacement eliminates that risk with minimal extra work.

**Alternatives considered:** Wrapping the uuid@14 ESM source via dynamic `import()` at
startup — rejected because (a) async module loading does not compose well with
synchronous `require()`, and (b) it still pulls in the vulnerable package as a
dependency.

---

### D2 — Node built-in `crypto` only, no npm dependencies

**Decision:** Every UUID algorithm is implemented using `require('crypto')` exclusively.

| Export | Algorithm | Implementation |
|--------|-----------|----------------|
| `v4`   | Random    | `crypto.randomUUID()` |
| `v1`   | Time-based (Gregorian) | `crypto.randomBytes(10)` for node ID + clock seq; `Date.now()` for timestamp |
| `v6`   | Reordered time-based  | Same as v1, most-significant time bits placed first |
| `v7`   | Unix timestamp + random | 48-bit `Date.now()` prefix + `crypto.randomBytes(10)` |
| `v3`   | MD5 namespace         | `crypto.createHash('md5')` |
| `v5`   | SHA-1 namespace       | `crypto.createHash('sha1')` |

**Rationale:** Zero dependencies means zero transitive CVEs. This is the primary
security benefit of owning the implementation.

**Alternatives considered:** Vendoring the uuid@14 source — rejected because the
upstream source is ESM, and transpiling it introduces its own maintenance burden and
potential for drift.

---

### D3 — Package version starts at 14.0.0

**Decision:** Initial `package.json` version is `14.0.0`.

**Rationale:** The npm `overrides` entry `"uuid": "npm:@izgateway/uuid-cjs@^14.0.0"`
uses a semver range anchored to the fixed version of the real uuid package. Starting at
`14.0.0` satisfies that range and makes the intent (compatibility replacement for
uuid@14) obvious.

---

### D4 — Package scope: `@izgateway`, registry: GitHub Packages

**Decision:** Package name is `@izgateway/uuid-cjs`, published to
`https://npm.pkg.github.com`.

**Rationale:** Consistent with all other IZ Gateway npm packages. Uses `GITHUB_TOKEN`
for auth — no additional secrets required. If this package is ever promoted to the
public npm registry, the scope can be changed in `package.json` with a minor version bump.

Consumers add a one-time `.npmrc` entry:
```
@izgateway:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

---

### D5 — CJS-only packaging with `index.d.ts` declarations

**Decision:** `src/index.js` uses `module.exports = { ... }`. No ESM entry point.
TypeScript declarations live in `src/index.d.ts` referenced by `"types"` in
`package.json`.

**Rationale:** Dual-mode CJS+ESM packaging adds complexity (conditional exports,
separate build output). Our only consumer requirement is `require()` compatibility.
TypeScript declarations are cheap to write and prevent type errors in TypeScript
consumers without requiring a build step.

**Package entry points:**
```json
{
  "main": "src/index.js",
  "types": "src/index.d.ts"
}
```

No build step required — the `src/index.js` is the published CJS artifact directly.

---

### D6 — CICD follows established IZ Gateway npm pattern

**Decision:** Single `ci.yml` workflow with two jobs: `dev-publish` (PR lifecycle +
`workflow_dispatch`) and `release` (PR `closed` + `merged == true`). Bump type from
`bump:patch`/`bump:minor`/`bump:major` PR label, defaulting to `patch`.

**Rationale:** Established pattern from `izg-dependency-scripts` `cve-scan-action` CR.
Consistency across IZ Gateway npm repos simplifies onboarding and maintenance.

Key differences from Maven/Java repos in this project:
- Branching: `feature → main` (no `develop`/`release` branches)
- Versioning: PR-label-driven, not calendar-based
- Auth: `GITHUB_TOKEN` only (no org secrets needed)

---

### D7 — ~~Gitleaks for secret scanning~~

_(removed — out of scope for this package)_

---

## Migration Plan

**[Risk] Clock accuracy for v1/v6/v7 on low-resolution systems**
→ Node.js `Date.now()` provides millisecond resolution on all supported platforms
(Node 18+). v1/v6 monotonicity is ensured by incrementing the clock sequence within
the same millisecond. Acceptable for the use case (JWT JTI generation in next-auth).

**[Risk] v3/v5 use MD5/SHA-1, which are cryptographically broken hash functions**
→ This is inherent to RFC 4122 v3/v5 design. These versions are not intended for
security use; they are deterministic name-based identifiers. The same risk exists in
uuid@14. No mitigation needed beyond documentation.

**[Risk] crypto.randomUUID() not available on Node < 15**
→ Minimum Node version for IZ Gateway apps is Node 18; this is not a practical risk.
The `package.json` `"engines"` field will document `>=18`.

**[Risk] npm overrides only work in the root package.json**
→ `npm overrides` is a root-level-only feature. Any consumer using Yarn or pnpm needs
equivalent configuration (`resolutions` for Yarn, `overrides` for pnpm). Documentation
covers this. Our immediate consumer (`izg-configuration-console`) uses npm, so this is
not a current blocker.

**[Risk] Output divergence from uuid@14 for v1/v6 edge cases**
→ The node ID and clock sequence initialization differ slightly from uuid@14 (we use
fresh random bytes each process start, same as uuid@14). Regression tests against
known uuid@14 output vectors for v3/v5 (deterministic) will catch format divergence.
v1/v6/v7 are non-deterministic so format conformance (version nibble, variant bits)
is tested instead.

---

## Migration Plan

1. **Implement and publish `@izgateway/uuid-cjs@14.0.0`** to GitHub Packages on `main` merge
2. **Add npm override** to `izg-configuration-console/package.json`:
   ```json
   "overrides": { "uuid": "npm:@izgateway/uuid-cjs@^14.0.0" }
   ```
3. **Run `npm install`** and verify `npm ls uuid` shows all instances resolved to
   `@izgateway/uuid-cjs@14.x`
4. **Run `npm audit`** and confirm no GHSA-w5hq-g745-h8pq finding
5. **Smoke-test** login/logout/token refresh in `izg-configuration-console` locally
6. **Open PR** for the override change; CI pipeline verifies the build passes

**Rollback:** Remove the `overrides` entry. The vulnerable uuid@8.3.2 returns inside
`next-auth`. The CVE finding reappears but the application is otherwise functional.
No data migration required.

---

## Open Questions

_None — all decisions are resolved. Proceed to tasks._
