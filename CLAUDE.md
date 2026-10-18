# osrs-tracker-packages

The four `@osrs-tracker/*` npm packages in `packages/<name>/`, one npm workspace with one root lockfile: `models` (the
shared data types and the stored hiscore encoding), `hiscores` (fetches and maps Jagex's hiscores; `models` is its
peer), `logger` and `express-metrics`. The osrs-tracker-aws Lambdas use `models` and `hiscores`; osrs-tracker-api and
osrs-tracker-web use all four, from npm. Sibling repos: `../osrs-tracker-aws`, `../osrs-tracker-api` and
`../osrs-tracker-web`. **This repo is public.**

**Load the `osrs-tracker-packages` skill before writing, reviewing, versioning, publishing or committing anything
here.** It holds the versioning, publishing, changelog, review and release rules. Keep detail there, not in this file.

## Commands

- Once per checkout, at the root: `npm ci`. Worktrees in `.claude/worktrees/` need their own: one workspace, so one
  install covers all four packages (the pre-push hook needs it too).
- From the root, every package in workspace order: `npm run lint`, `npm run build`, `npm run typecheck` (the specs'
  `tsconfig.spec.json`, in `hiscores` and `models`), `npm test` (`vitest run`, one Vitest project per package in the
  root `vitest.config.mts`), `npm run knip` (unused files, dependencies and internal exports), `npm run prettier:ci`.
  One package: `-w packages/<name>` on the npm scripts, `npx vitest run --project <name>`. Build `models` first:
  `hiscores` builds and type-checks against the local `models`, whose `exports` point at `dist/`. models'
  `*.int.spec.ts` tests start an in-memory MongoDB 8.0.
- The `verify` skill's `.claude/skills/verify/verify.sh` runs all of these for every package at once, in one call;
  Claude Code runs it before each commit.

## Hard rules

- Never write secrets, tokens, account, resource or ruleset IDs into code, docs, issues or commits.
- npm publishes are public and irreversible: get an explicit go-ahead (a "release it" counts). The `Publish` workflow
  stages a version from `main`; it goes out only once the user approves it on npm with 2FA.
- Every change except a doc-only one gets a changelog entry: CI, tooling (`.claude/hooks/`, `.claude/settings.json`,
  scripts such as `.claude/skills/verify/verify.sh`) and repo-level config in the root `CHANGELOG.md` under today's
  `## YYYY-MM-DD`, newest first; package changes in the package's own `CHANGELOG.md` (`## Unreleased`, or
  `## X.Y.Z - YYYY-MM-DD` with a release). Doc-only means `README.md` files (the root's or a package's), `CLAUDE.md`,
  and the Markdown files in `.claude/skills/` and `.claude/agents/`. A dependency bump gets an entry only when it
  changes behaviour (a new feature used, a fix that matters, a breaking change handled).
- Doc-only changes go straight to `main`; for anything else, ask: `main` or a PR (unless releasing). Never
  `--no-gpg-sign`.

## Where things live

- `packages/<name>/`: `src/` (`index.ts` is the public API), `CHANGELOG.md`, `README.md`, and a copy of the root
  `LICENSE` and `NOTICE` (Apache-2.0). `dist/` is built on publish (`prepublishOnly`) and not committed; `files` limits
  the tarball to `dist/`, `CHANGELOG.md` and `NOTICE`. Each ships `dist/cjs`, `dist/esm` and `dist/types`:
  osrs-tracker-api `require`s the CJS build and osrs-tracker-web bundles the ESM one.
- Root `package.json`: the workspace (in the order `models`, `hiscores`, `logger`, `express-metrics`) and the shared
  devDependencies, and the scripts that run every package; a package's own dependencies are in its `package.json`.
  Shared by every package: `tsconfig.base.json` (each package's `tsconfig.json` extends it), `scripts/build-package.sh`
  (every `build`), `vitest.config.mts` (one project per package), `knip.jsonc` and `.oxlintrc.json` (the lint config;
  oxlint until typescript-eslint supports TypeScript 7, osrs-tracker/osrs-tracker-packages#9).
- osrs-tracker-aws's [DATA-MODEL.md](https://github.com/osrs-tracker/osrs-tracker-aws/blob/main/DATA-MODEL.md): who
  writes each stored field and owns each index, and the stored hiscore format. It stays there; `models` defines the
  encoding.
- `.github/workflows/main.yml`: CI checks every package on every push to `main` and every PR (lint, tests, type check,
  build, and a load check that packs each package and loads it with `require` and `import`), plus Prettier and an
  offline link check, after one `npm ci` at the root. Its `CI` job is a required check, with `zizmor.yml`'s `zizmor`
  (audits the workflows; `.github/zizmor.yml` says what it allows). `publish.yml` (run by hand) stages one package on
  npm with trusted publishing.
- `.claude/agents/conventions-reviewer.md` reviews diffs against the skill and this file;
  `.claude/hooks/read-only-bash.sh` keeps it to git, gh and grep reads. `.claude/settings.json` runs Prettier on every
  file Claude edits, and `.claude/hooks/pre-push-check.sh` blocks `git push` (also `git -C <path> push`) when Prettier
  or a package's lint fails in the checkout being pushed.
