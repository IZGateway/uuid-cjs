# Spec: Secret Safety

## Requirements

### Requirement: No tokens committed to the repository

The repository MUST NOT contain any hardcoded tokens, passwords, API keys, or other
secrets in any committed file — including `.npmrc`, workflow files, `package.json`,
scripts, or documentation. All authentication MUST be provided at runtime via
environment variables or GitHub Actions secrets.

#### Scenario: .npmrc does not contain a token

- **WHEN** the `.npmrc` file committed to the repository is inspected
- **THEN** it contains only the registry scope mapping
  (`@izgateway:registry=https://npm.pkg.github.com/`) and any consumer-facing
  `${NPM_TOKEN}` placeholder that expands from the environment at install time
- **AND** no literal token value is present in the file

#### Scenario: Workflow files do not contain hardcoded secrets

- **WHEN** all `.github/workflows/*.yml` files are inspected
- **THEN** no literal token, password, or API key appears in any file
- **AND** all secret values are referenced only via `${{ secrets.* }}` or
  `${{ secrets.GITHUB_TOKEN }}`

---

### Requirement: npm publish authentication via GITHUB_TOKEN only

The CI publish workflow MUST authenticate to GitHub Packages using
`NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` passed to the `npm publish` step.
No additional org secrets or personal access tokens MUST be required for publishing.

#### Scenario: Dev publish succeeds with GITHUB_TOKEN

- **WHEN** the dev publish job runs with the automatic `GITHUB_TOKEN`
- **THEN** `npm publish --force --tag dev` succeeds without requiring any additional secret

#### Scenario: Release publish succeeds with GITHUB_TOKEN

- **WHEN** the release job runs with the automatic `GITHUB_TOKEN`
- **THEN** `npm publish --tag latest` succeeds without requiring any additional secret

---

### Requirement: Consumer .npmrc uses environment variable expansion

Documentation and any committed `.npmrc` that references the auth token MUST use
the `${NPM_TOKEN}` environment variable placeholder syntax so that the token is
never stored in the file itself. Consumers MUST supply the token via their
environment or CI secrets at install time.

#### Scenario: Consumer installs package with NPM_TOKEN in environment

- **WHEN** a consumer's `.npmrc` contains
  `//npm.pkg.github.com/:_authToken=${NPM_TOKEN}`
- **AND** the `NPM_TOKEN` environment variable is set to a valid GitHub token
- **THEN** `npm install @izgateway/uuid-cjs` succeeds

#### Scenario: Missing NPM_TOKEN causes install to fail with auth error

- **WHEN** `NPM_TOKEN` is not set in the environment
- **THEN** `npm install @izgateway/uuid-cjs` fails with a 401 authentication error
- **AND** no token value is exposed in the error output

---

### Requirement: Gitleaks scanning prevents secret leakage

_(removed — out of scope for this package)_
