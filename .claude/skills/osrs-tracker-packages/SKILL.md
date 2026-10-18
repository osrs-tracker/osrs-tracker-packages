---
name: osrs-tracker-packages
description:
  Rules and workflow for osrs-tracker-packages (the `@osrs-tracker/*` npm packages `models`, `hiscores`, `logger` and
  `express-metrics`). Use when writing or reviewing package code, adding a new hiscores skill, boss or activity,
  changing the stored hiscore format, the metrics series or the log line shape, bumping a version, publishing a package,
  or committing, pushing, releasing or shipping this repo.
---

# osrs-tracker-packages

Four npm packages in `packages/<name>/`, one npm workspace with one root lockfile. The osrs-tracker-aws Lambdas use
`models` and `hiscores`; osrs-tracker-api and osrs-tracker-web use all four. Those repos (`../osrs-tracker-aws`,
`../osrs-tracker-api`, `../osrs-tracker-web`) have their own skills.

**This repo is public.** Never write secrets, tokens, account, resource or ruleset IDs into code, docs or commits.

Load when needed: osrs-tracker-aws's
[DATA-MODEL.md](https://github.com/osrs-tracker/osrs-tracker-aws/blob/main/DATA-MODEL.md) (who writes which
`players`/`items`/`hiscoreLayouts` field and owns which index, the stored hiscore format). It stays there: `models`
defines the encoding, osrs-tracker-aws documents who writes it. The `conventions-reviewer` agent reviews diffs against
this file at runtime, so keep rules here, not in the agent; repo-specific review rules go in `## Review rules`.

## Rules

- **npm publishes** are public and irreversible: get explicit go-ahead (a "release it" counts).
- Every package ships `dist/cjs`, `dist/esm` and `dist/types`: osrs-tracker-api `require`s the CJS build and
  osrs-tracker-web bundles the ESM one, so a build change must keep both loading. `dist/` isn't committed.
- Dependencies: the shared devDependencies (TypeScript, oxlint, Prettier, Vitest, `@types/node`) live in the root
  `package.json`; a package's own go in its `package.json` (`npm install <pkg> -w packages/<name>`, from the root).
  There is one `package-lock.json`, at the root.
- `.oxlintrc.json` at the root is every package's lint config (each `lint` script passes it with `-c`): oxlint until
  typescript-eslint supports TypeScript 7 (osrs-tracker/osrs-tracker-aws#143).
- A change a consumer has to follow (a bump, a breaking change) is an issue in that consumer's repo, not a change made
  from here.

## Jagex hiscore change (new skill, boss or activity)

From `@osrs-tracker/hiscores` 4.0.0 (roadmap osrs-tracker/osrs-tracker-aws#52), entries are mapped by name from Jagex's
response (`fromJagex`), so a new skill or activity is stored, served and diffed without a release. Add the member to
`SkillEnum` or `ActivityEnum` in `models` (`packages/models/src/models/hiscore.enum.ts`), with the value exactly as the
`name` in Jagex's JSON hiscores, only when code refers to that name (the web's display layouts and categories), and
release a models minor. Consumers import the enums from models (hiscores re-exports nothing from it since 5.0.0).

## Stored hiscore format

`encodeHiscoreEntry`, `decodeHiscoreEntries`, `hiscoreEntriesWriteExpression` and `layoutId` in `models` define what's
stored in `players.hiscoreEntries` and `hiscoreLayouts`
([DATA-MODEL.md](https://github.com/osrs-tracker/osrs-tracker-aws/blob/main/DATA-MODEL.md)). A change that existing
entries can't be decoded with isn't a normal release: it needs a migration and every writer and reader switched
together, like roadmap osrs-tracker/osrs-tracker-aws#52, and an update to DATA-MODEL.md through an issue in
osrs-tracker-aws.

## Versioning

Bump `package.json`, add a `## X.Y.Z - YYYY-MM-DD` entry (no `v`) to the package's `CHANGELOG.md`, and verify (the build
is a local check only: `dist/` isn't committed, and `prepublishOnly` rebuilds it on publish). An `## Unreleased` section
becomes that version's entry. Start an entry that breaks a consumer (the Lambdas, osrs-tracker-api, osrs-tracker-web)
with `**Breaking:**`, and say what the consumer has to change.

A new `models` major: in the same change, move hiscores' `@osrs-tracker/models` devDependency to the new major (and its
peer range, below) and run `npm install` at the root. The workspace links the local `models` only while it satisfies
that range; otherwise npm installs the published one under `packages/hiscores/node_modules`, and hiscores builds and
tests against that instead.

## Publishing

`npm publish` in the package directory (or `npm publish -w packages/<name>` from the root). 2FA's browser flow fails
from a non-interactive shell (`EOTP`): ask the user for a fresh OTP and run `npm publish --otp=<code>` immediately, or
let them publish. `prepublishOnly` runs the package's build, and hiscores' build needs `models`' `dist/`: build `models`
first (`npm run build -w packages/models`).

Order:

1. `models`.
2. `hiscores`, widening its models peer range (e.g. `^old || ^new`), or narrowing it to the new major when hiscores
   needs it (hiscores 4.0.0 takes only models `^2.0.0`).
3. Consumers, each through an issue in its repo: the Lambdas in osrs-tracker-aws, then web and API. **The web must bump
   models and hiscores together.**

`express-metrics` stands alone (no `@osrs-tracker/*` dependencies); its consumers are the web and API servers. Its
series (`http_request_duration_seconds` names, labels, buckets and help text, `up`) are what Prometheus scrapes and
dashboards query: changing them is a breaking change, and its tests pin them.

`logger` stands alone too, with the same consumers. Its line shape (`level` names, `time`, `type`, `message`, `error`,
and the request fields `status`, `aborted`, `route`, `responseTime`, …) is what Loki queries and runbooks filter on:
changing a field name or level name is a breaking change, and its tests pin them.

Wait for a 200 from `https://registry.npmjs.org/@osrs-tracker%2f<pkg>/<version>` (about a minute) rather than trusting
`npm view`.

## Verify

The `verify` skill runs all of this at once for every package. By hand, from the package folder (or with
`-w packages/<name>` from the root), after `npm ci` once at the root:

- `models`, `hiscores`: `npm run lint && npx vitest run && npx tsc -p tsconfig.spec.json && npm run build` (Vitest
  doesn't type-check; models' `*.int.spec.ts` tests start an in-memory MongoDB 8.0 with `mongodb-memory-server`, whose
  binary the Vitest `globalSetup` `packages/models/src/mongodb.global-setup.ts` downloads once)
- `logger`, `express-metrics`: `npm run lint && npx vitest run && npm run build` (`npm test` is watch mode in every
  package)
- `hiscores` builds and type-checks against the local `models`, whose `exports` point at `dist/`: build `models` first.
- Repo root: `npm run prettier:ci`

CI checks every package on every push: lint, Vitest, the spec type check, the build, and a load check that packs each
package and loads it with `require` and `import`; plus Prettier and an offline link check.

## Review rules

What `conventions-reviewer` checks beyond the rules above. It reads this section; keep repo rules here, not in the
agent.

- Read [DATA-MODEL.md](https://github.com/osrs-tracker/osrs-tracker-aws/blob/main/DATA-MODEL.md) when the diff changes
  the stored hiscore format (`encodeHiscoreEntry`, `decodeHiscoreEntries`, `hiscoreEntriesWriteExpression`, `layoutId`)
  or the type of a stored document in `models`: the change must still match it, or come with an issue in
  osrs-tracker-aws. Read it from the sibling checkout with `git -C <osrs-tracker-aws> show origin/main:DATA-MODEL.md`;
  when there is none, make it a **check**.
- Rules that span files, checked against the whole diff: a change and its `CHANGELOG.md` entry (root or the package's),
  except where `CLAUDE.md` exempts it; a package change that breaks a consumer and its `**Breaking:**` entry (a removed
  or renamed export, a changed signature, the `express-metrics` series or the `logger` line shape); a `package.json`
  version bump and its `## X.Y.Z - YYYY-MM-DD` entry.
- **breaks** here also covers: leaks a secret, token or ID; a stored-format change existing entries can't be decoded
  with, without a migration; a build change that drops `dist/cjs`, `dist/esm` or `dist/types`. A typical **check**:
  whether a consumer uses an export the diff removes or changes (name the export; the caller runs `git grep` on
  `origin/main` of osrs-tracker-aws, osrs-tracker-api and osrs-tracker-web).

## Release ("release it", "ship it")

Run the whole flow without asking between steps; stop only on failure. The request is the go-ahead to publish what the
change touches. Verify locally once before committing; after that CI is the gate (the build a publish runs still runs).

1. Commit on a `<type>/<short-name>` branch, push, `gh pr create --base main`.
2. Review `gh pr diff` for bugs and leftovers while the `conventions-reviewer` agent checks the PR (spawn it without a
   `model`, which would override its Sonnet pin). Its first line is a `VERDICT:`; check each finding against the code
   before fixing it and drop the ones that don't hold. Fix both and push.
3. Once CI passes, publish the changed packages in the order above and check each one's registry 200.
4. Commit any follow-up bump (a widened peer range), push, and record what shipped and the check results in the PR
   description. Open the consumer issues (Publishing, step 3) and link them from the PR.
5. Once checks pass: `gh pr merge <n> --merge`, switch to `main`, pull, `git branch -d <branch>`, `git fetch --prune`.

## Commit and push

- Doc-only changes (as `CLAUDE.md` defines them) go straight to `main`. Otherwise, outside a release, **ask every
  time**: `main` or a PR. The admin account bypasses `main`'s PR rule; after a direct push,
  `gh run watch --exit-status`. After a PR merges, do release step 5's cleanup.
- PRs need the `CI` and `zizmor` checks, up to date with `main` (the `main` ruleset). The same ruleset blocks a merge on
  CodeQL code scanning alerts of high severity or higher, or of `error` level: fix the alert, or dismiss it with a
  reason in the Security tab, and never copy an open alert's details into an issue, PR, commit or `CHANGELOG.md` (it's a
  vulnerability report in a public repo).
- Publishing from a PR branch ships unmerged code: tell the user. Commit and push in the same session as any publish.
- Conventional commits. Scopes: `models`, `hiscores`, `logger`, `express-metrics`, `ci(actions)`, `docs(skill)`, `chore`
  (repo-wide tooling and config).
- **Changelog entries**: which changes get one, and where, is in `CLAUDE.md`. Root days are `## YYYY-MM-DD`, newest
  first; package entries follow Versioning above. Say what changed and why. Busy days get `###` subtitles by area
  ("Behind the scenes" last), not repeated in their entries. Extend an existing entry rather than add a near-duplicate.
  When adding an entry, reread the whole day: add subtitles once it's busy, and merge entries about the same feature.
- GPG "Inappropriate ioctl for device": ask the user to run `echo test | gpg --clearsign > /dev/null` in their terminal.
  Never use `--no-gpg-sign`.
- `gh pr edit` can fail on a Projects (classic) error; use
  `gh api -X PATCH repos/osrs-tracker/osrs-tracker-packages/pulls/<n> -F body=@<file>`.
