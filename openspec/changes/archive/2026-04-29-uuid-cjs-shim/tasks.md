## 1. Repository Bootstrap

- [ ] 1.1 Add `.gitignore` (node_modules, .env, *.log, coverage/)
- [ ] 1.2 Create `package.json` with name `@izgateway/uuid-cjs`, version `14.0.0`, `"main": "src/index.js"`, `"types": "src/index.d.ts"`, `"engines": {"node": ">=18"}`, zero dependencies, `publishConfig` pointing to GitHub Packages
- [ ] 1.3 Create `.npmrc` with `@izgateway:registry=https://npm.pkg.github.com/` and `//npm.pkg.github.com/:_authToken=${NPM_TOKEN}` (no hardcoded token)
- [ ] 1.4 Initial commit and push to `main` on `IZGateway/uuid-cjs`

## 2. Core Implementation

- [ ] 2.1 Create `src/index.js` — implement `NIL` and `MAX` constants
- [ ] 2.2 Implement `validate(str)` — regex-based, returns `false` for non-string input without throwing
- [ ] 2.3 Implement `parse(str)` — convert UUID string to `Uint8Array(16)`, throw `TypeError` on invalid input
- [ ] 2.4 Implement `stringify(arr, offset)` — convert 16-byte array to lowercase hyphenated UUID string, throw `TypeError` on invalid input
- [ ] 2.5 Implement `version(str)` — extract version nibble as integer, throw `TypeError` on invalid input
- [ ] 2.6 Implement `v4(options, buf, offset)` — delegate to `crypto.randomUUID()`, support optional buffer write
- [ ] 2.7 Implement v3/v5 shared namespace hashing helper using `crypto.createHash(algorithm)`
- [ ] 2.8 Implement `v3(name, namespace, buf, offset)` using MD5 helper
- [ ] 2.9 Implement `v5(name, namespace, buf, offset)` using SHA-1 helper
- [ ] 2.10 Implement `v1(options, buf, offset)` — Gregorian time-based UUID using `crypto.randomBytes()` for node ID and clock seq
- [ ] 2.11 Implement `v6(options, buf, offset)` — reordered time-based UUID (most-significant time bits first)
- [ ] 2.12 Implement `v7(options, buf, offset)` — 48-bit Unix ms timestamp prefix + `crypto.randomBytes()`
- [ ] 2.13 Export all functions and constants from `src/index.js` via `module.exports`

## 3. TypeScript Declarations

- [ ] 3.1 Create `src/index.d.ts` with accurate type signatures for all 12 exports (`v1`–`v7`, `validate`, `parse`, `stringify`, `version`, `NIL`, `MAX`)
- [ ] 3.2 Verify `tsc --noEmit` resolves the declarations without error from a TypeScript consumer file

## 4. Tests

- [ ] 4.1 Add `devDependencies` for test runner (e.g., Node built-in `node:test` + `assert` — no extra deps required)
- [ ] 4.2 Add `"test"` script to `package.json`
- [ ] 4.3 Write tests for `validate` — valid UUID, NIL UUID, MAX UUID, non-UUID string, non-string inputs
- [ ] 4.4 Write tests for `parse` / `stringify` round-trip and `TypeError` on invalid input
- [ ] 4.5 Write tests for `version` — correct version integer for each UUID version (v1–v7), and that it throws `TypeError` on invalid input
- [ ] 4.6 Write tests for `v4` — format match, two calls differ, buffer write mode
- [ ] 4.7 Write tests for `v3` — assert output equals `'0bacede4-4014-3f9d-b720-173f68a1c933'` for `v3('hello', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')` (uuid@14 verified); version nibble is implicitly confirmed by that vector
- [ ] 4.8 Write tests for `v5` — assert output equals `'9342d47a-1bab-5709-9869-c840b2eac501'` for `v5('hello', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')` (uuid@14 verified); version nibble is implicitly confirmed by that vector
- [ ] 4.9 Write tests for `v1` — version nibble = 1, two successive calls produce different or monotonically increasing values
- [ ] 4.10 Write tests for `v6` — version nibble = 6, lexicographic sort = chronological order
- [ ] 4.11 Write tests for `v7` — version nibble = 7, lexicographic sort = chronological order
- [ ] 4.12 Write test that `require('@izgateway/uuid-cjs')` exposes all expected exports

## 5. CI Workflow — Dev Publish

- [ ] 5.1 Create `.github/workflows/ci.yml` skeleton with correct trigger events (`pull_request` types `opened`/`synchronize`/`labeled`/`closed`, `workflow_dispatch`)
- [ ] 5.2 Add `dev-publish` job: check out, set up Node, read current version from `package.json`, compute next version from bump label (default `patch`), run `npm version <bump> --no-git-tag-version`, publish with `--force --tag dev`, authenticate via `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- [ ] 5.3 Verify `dev-publish` job does NOT commit to the branch
- [ ] 5.4 Add `workflow_dispatch` path to `dev-publish` job

## 6. CI Workflow — Release

- [ ] 6.1 Add `release` job to `ci.yml` triggered on `pull_request` type `closed` with `github.event.pull_request.merged == true`
- [ ] 6.2 Release job: read bump label from merged PR labels, run `npm version <bump>`, commit `package.json` with message `chore: release vX.Y.Z [skip ci]`, push to `main`
- [ ] 6.3 Release job: publish to GitHub Packages with `--tag latest` (no `--force`), authenticate via `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
- [ ] 6.4 Release job: create exact version tag `vX.Y.Z` and force-update floating major tag `vX` — only after successful publish
- [ ] 6.5 Verify `permissions: contents: write` and `packages: write` are declared on the workflow

## 7. Wire Override into Consuming Applications

_(moved to separate CRs: `uuid-cve-remediation` in `izg-configuration-console` and `izg-transformation-ui`)_
