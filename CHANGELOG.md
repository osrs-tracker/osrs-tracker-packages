# Changelog

Changes to CI, tooling and the repo itself. Package changes are logged in each package's own
`packages/<name>/CHANGELOG.md`. Housekeeping (tooling, CI) is logged on purpose, because sessions read this as the
repo's history; doc-only changes are not.

## 2026-10-29

- CI runs on Node 26 LTS (`main.yml`, `publish.yml`; Node 26 bundles npm 11.20.0, which has `npm stage`), and the shared
  `@types/node` devDependency moves to `^26.6.6` (issue osrs-tracker/osrs-tracker-packages#22). `@types/node` 26 removes
  `TransferListItem`, which pino's `thread-stream` 4.2.0 still declares, so logger's `tsconfig.json` sets `skipLibCheck`
  (as the specs' configs already do).

## 2026-10-26

- CI checks for copied and circular code: jscpd (copy-pasted code in `packages/`, failing over 1% duplicated lines,
  `.jscpd.json`) runs after knip in CI and in the verify skill, and oxlint's `import/no-cycle` fails a package's lint on
  a circular import.

## 2026-10-25

- The root `NOTICE` links the OSRS Tracker website at its new address, https://osrs-tracker.net (issue
  osrs-tracker/osrs-tracker-packages#19).

## 2026-10-18

- Publishing: a `Publish` workflow, run by hand from `main`, stages a package's version on npm with trusted publishing
  (OIDC, no stored npm token), so releases carry provenance and need no OTP in a shell. Each package's trusted publisher
  allows staging only, so nothing is released until a maintainer approves it on npm with 2FA. Build tool (`tsc`) and
  Dependabot (actions only, no npm updates) stay as they are (issue osrs-tracker/osrs-tracker-packages#6).
- CI: one workflow checks every package on each push (lint, Vitest, spec type-check, build, and a load check of the
  packed tarball with `require` and `import`), plus Prettier, a local link check and zizmor, with Dependabot keeping the
  action refs current, so the packages keep the checks they had in osrs-tracker-aws (issue
  osrs-tracker/osrs-tracker-packages#2).
- Claude Code hooks: Prettier runs on every file Claude edits, and a pre-push hook blocks a `git push` (also
  `git -C <path> push`) when the root Prettier check or any package's lint fails in the checkout being pushed, so
  formatting and lint errors are caught before CI. The conventions reviewer is limited to git, gh and grep reads. The
  oxlint config's note now points at this repo's ESLint-return issue, osrs-tracker/osrs-tracker-packages#9 (issue
  osrs-tracker/osrs-tracker-packages#3).
- Simpler package setup, with the published output unchanged: one `tsconfig.base.json` that each package's
  `tsconfig.json` extends, one `scripts/build-package.sh` for every `build`, one root `vitest.config.mts` with a project
  per package (models keeps its MongoDB `globalSetup`), and root `lint`, `build`, `typecheck` and `test` scripts that CI
  and the verify skill run. `models` and `hiscores` export by name from `src/index.ts`, so a helper another module
  imports no longer becomes public by accident; the public API is the same. knip (`npm run knip`, in CI and the verify
  skill) reports unused files, dependencies and internal exports; it found none (issue
  osrs-tracker/osrs-tracker-packages#4).
