# Spec: CI Publish Workflow

## Requirements

### Requirement: Workflow file location and trigger events

A GitHub Actions workflow MUST exist at `.github/workflows/ci.yml` that triggers on:
1. `pull_request` types `opened`, `synchronize`, and `labeled` targeting `main` — for
   dev publishes during the PR cycle
2. `pull_request` type `closed` targeting `main` — for release on merge
3. `workflow_dispatch` with an optional `ref` input — for manual dev publishes from
   any branch without an open PR

#### Scenario: PR opened triggers dev publish

- **WHEN** a developer opens a PR against `main`
- **THEN** the dev publish job runs and publishes `X.Y.Z-dev` to dist-tag `dev`

#### Scenario: New commits pushed to open PR re-trigger dev publish

- **WHEN** a developer pushes additional commits to a branch with an open PR
- **THEN** the workflow re-runs and republishes `X.Y.Z-dev` with `--force`

#### Scenario: PR merged triggers release

- **WHEN** a PR targeting `main` is merged
- **THEN** the release job runs: version is bumped, `package.json` is committed,
  the package is published to `@latest`, and Git tags are created

#### Scenario: PR closed without merging does not release

- **WHEN** a PR is closed without merging
- **THEN** the release job does NOT run and no version bump or publish occurs

#### Scenario: workflow_dispatch publishes dev from any branch

- **WHEN** a developer dispatches the workflow from any branch
- **THEN** the dev publish job runs and publishes `X.Y.Z-dev` to dist-tag `dev`

---

### Requirement: Bump type from PR label, defaulting to patch

The workflow MUST compute the version bump type from a `bump:*` label on the PR.
If no `bump:*` label is present, the bump type MUST default to `patch`.

| Label present      | Bump applied |
|--------------------|--------------|
| *(none)*           | `patch`      |
| `bump:patch`       | `patch`      |
| `bump:minor`       | `minor`      |
| `bump:major`       | `major`      |

#### Scenario: No label defaults to patch

- **WHEN** a PR has no `bump:*` label and `package.json` is at `14.0.0`
- **THEN** the dev publish uses version `14.0.1-dev` and the release bumps to `14.0.1`

#### Scenario: bump:minor label applies minor bump

- **WHEN** a PR has label `bump:minor` and `package.json` is at `14.0.0`
- **THEN** the dev publish uses version `14.1.0-dev` and the release bumps to `14.1.0`

---

### Requirement: Dev publish does not modify package.json

The dev publish MUST NOT commit any changes to the repository. The computed version
string MUST be applied in the CI environment only via `--no-git-tag-version`.

#### Scenario: package.json is unchanged after dev publish

- **WHEN** the dev publish workflow completes
- **THEN** `package.json` on the branch still contains the original version string
- **AND** no commit is made to any branch

---

### Requirement: Dev publish uses --force and dist-tag dev

The dev publish MUST use `npm publish --force --tag dev` so that the same
`X.Y.Z-dev` version string can be republished on each PR push without conflict.

#### Scenario: Second push to same PR overwrites dev publish

- **WHEN** a developer pushes a second commit to an open PR
- **THEN** `npm publish --force` overwrites the existing `X.Y.Z-dev` entry
- **AND** the `dev` dist-tag continues to point to the latest dev build

---

### Requirement: Release bumps version, commits to main, and publishes to @latest

On PR merge, the release job MUST:
1. Run `npm version patch|minor|major` based on the merged PR's bump label
2. Commit the updated `package.json` to `main` with message containing `[skip ci]`
3. Publish to GitHub Packages with `--tag latest` and without `--force`

#### Scenario: Version bump commit appears on main

- **WHEN** version `14.1.0` is released
- **THEN** a commit with message containing `[skip ci]` appears on `main`
- **AND** `package.json` on `main` contains `"version": "14.1.0"`

#### Scenario: Workflow does not re-trigger on version bump commit

- **WHEN** the version bump commit is pushed to `main`
- **THEN** no new workflow run is triggered because the commit message contains `[skip ci]`

#### Scenario: Duplicate version publish fails loudly

- **WHEN** the same version string was already published
- **THEN** `npm publish` fails with a 409 conflict error
- **AND** no Git tags are created

---

### Requirement: Git tags created after successful publish

After a successful publish, the release job MUST:
1. Create an exact version tag `vX.Y.Z` pointing to the version bump commit
2. Force-update the floating major tag `vX` to point to the same commit

Tags MUST be created only after `npm publish` succeeds. A failed publish MUST leave
no orphaned tags.

#### Scenario: Exact version tag and floating major tag are created

- **WHEN** version `14.1.0` is released
- **THEN** Git tag `v14.1.0` exists pointing to the version bump commit on `main`
- **AND** Git tag `v14` is force-updated to point to the same commit

#### Scenario: Failed publish leaves no tags

- **WHEN** `npm publish` fails (e.g. auth error or version conflict)
- **THEN** no `vX.Y.Z` or `vX` tags are created in the repository

---

### Requirement: Workflow permissions

The CI workflow MUST declare the following permissions at the job level:

```yaml
permissions:
  contents: write
  packages: write
```

`contents: write` is required for committing the version bump and creating tags.
`packages: write` is required for `npm publish`.

#### Scenario: All workflow operations succeed with GITHUB_TOKEN only

- **WHEN** the workflow runs in the `IZGateway` org with default `GITHUB_TOKEN`
- **THEN** all steps (dev publish, version commit, release publish, tag creation)
  succeed without requiring a PAT or deploy key

---

### Requirement: Gitleaks secret scanning

_(removed — out of scope for this package)_
