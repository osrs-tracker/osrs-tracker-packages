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

**This repo is public.** `CLAUDE.md`'s hard rules say what never goes into code, docs, issues or commits.

Load when needed: osrs-tracker-aws's
[DATA-MODEL.md](https://github.com/osrs-tracker/osrs-tracker-aws/blob/main/DATA-MODEL.md) (who writes which
`players`/`items`/`hiscoreLayouts` field and owns which index, the stored hiscore format). It stays there: `models`
defines the encoding, osrs-tracker-aws documents who writes it. The `conventions-reviewer` agent reviews diffs against
this file at runtime, so keep rules here, not in the agent; repo-specific review rules go in `## Review rules`.

## Rules

- **npm publishes** are public and irreversible: get explicit go-ahead (a "release it" counts).
- Every package ships `dist/cjs`, `dist/esm` and `dist/types`: osrs-tracker-api `require`s the CJS build and
  osrs-tracker-web bundles the ESM one, so a build change must keep both loading. `dist/` isn't committed. Every
  package's `build` is `scripts/build-package.sh` (its arguments go to the types build), from its `tsconfig.json`, which
  extends the root `tsconfig.base.json` and keeps only the package's differences.
- `src/index.ts` is a package's public API and exports by name: a new public function or type is added there.
- Dependencies: the shared devDependencies (TypeScript, oxlint, Prettier, Vitest, `@types/node`) live in the root
  `package.json`; a package's own go in its `package.json` (`npm install <pkg> -w packages/<name>`, from the root).
  There is one `package-lock.json`, at the root.
- `.oxlintrc.json` at the root is every package's lint config (each `lint` script passes it with `-c`): oxlint until
  typescript-eslint supports TypeScript 7 (osrs-tracker/osrs-tracker-packages#9).
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

The `Publish` workflow (`.github/workflows/publish.yml`) stages a package's current `package.json` version from `main`
with trusted publishing, so the version carries provenance: `gh workflow run publish.yml --ref main -f package=<name>`,
then `gh run watch <id> --exit-status`. A staged version isn't released until the user approves it with 2FA (on
npmjs.com, or `npm stage list` then `npm stage approve <stage-id>` in their terminal); OIDC can't approve, and npm's
malware scan (about five minutes) runs first. Ask the user to approve, then wait for the registry 200 below. Only merged
code can be published, so merge before publishing.

Each package's trusted publisher allows `npm stage publish` only. npm drops one that isn't used within 2 days of being
created, so a run that fails to authenticate usually means it expired: check with `npm trust list @osrs-tracker/<name>`.
To recreate it, ask the user for a fresh OTP and run this at once, for every package that needs it (one code covers
several calls within its window):
`npm trust github @osrs-tracker/<name> --file publish.yml --repo osrs-tracker/osrs-tracker-packages --allow-stage-publish --otp=<code> -y`.
Never pass `--allow-publish`. A new package needs its first version published by hand before it can have one. When the
workflow can't run, the user publishes by hand (`npm publish` in the package directory, with an OTP), which carries no
provenance.

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

The `verify` skill runs all of this at once for every package. By hand, from the root after `npm ci` once there:
`npm run lint && npm run build && npm run typecheck && npm test && npm run knip && npm run prettier:ci`. Each runs every
package in workspace order; for one, pass `-w packages/<name>` to the npm scripts and use
`npx vitest run --project <name>`.

- `npm run typecheck` runs `tsc -p tsconfig.spec.json` in `hiscores` and `models`: Vitest doesn't type-check.
- `npm test` is `vitest run`: one project per package in the root `vitest.config.mts`. models' `*.int.spec.ts` tests
  start an in-memory MongoDB 8.0 with `mongodb-memory-server`, whose binary the models project's `globalSetup`
  (`packages/models/src/mongodb.global-setup.ts`) downloads once.
- `hiscores` builds and type-checks against the local `models`, whose `exports` point at `dist/`: build `models` first.
- `npm run knip` (`knip.jsonc`) reports unused files, dependencies and internal exports. It counts each package's
  `src/index.ts` exports as used, so it doesn't flag public exports no consumer imports: check those against the
  consumers' code before removing one.

CI checks every package on every push to `main` and every PR: the same root scripts, and a load check that packs each
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

Run the whole flow without asking between steps; stop only on failure, and when a staged version waits for the user's
approval. The request is the go-ahead to publish what the change touches. Verify locally once before committing; after
that CI is the gate (the build a publish runs still runs).

1. Commit on a `<type>/<short-name>` branch, including hiscores' peer range change (Publishing, step 2), push,
   `gh pr create --base main`.
2. Review `gh pr diff` for bugs and leftovers while the `conventions-reviewer` agent checks the PR (spawn it without a
   `model`, which would override its Sonnet pin). Its first line is a `VERDICT:`; check each finding against the code
   before fixing it and drop the ones that don't hold. Fix both and push.
3. Once checks pass: `gh pr merge <n> --merge`, switch to `main`, pull, `git branch -d <branch>`, `git fetch --prune`.
4. Once `main`'s CI passes, stage the changed packages with the `Publish` workflow in the order above, ask the user to
   approve each, and check each one's registry 200 before staging the next.
5. Record what shipped and the check results in a PR comment. Open the consumer issues (Publishing, step 3) and link
   them from the PR.

## Commit and push

- Doc-only changes (as `CLAUDE.md` defines them) go straight to `main`, without the verify skill. CI's link check fails
  `main` on a broken local link or `#anchor`, so run it first on the tracked files (a glob would also check
  `node_modules`): `lychee --offline --include-fragments $(git ls-files '*.md')`. Otherwise, outside a release, **ask
  every time**: `main` or a PR. The admin account bypasses `main`'s PR rule; after a direct push,
  `gh run watch --exit-status`. After a PR merges, do release step 3's cleanup.
- PRs need the `CI` and `zizmor` checks, up to date with `main` (the `main` ruleset). The same ruleset blocks a merge on
  CodeQL code scanning alerts of high severity or higher, or of `error` level: fix the alert, or dismiss it with a
  reason in the Security tab, and never copy an open alert's details into an issue, PR, commit or `CHANGELOG.md` (it's a
  vulnerability report in a public repo).
- That rule also blocks a PR CodeQL never analysed: default setup skips a PR that changes no JS/TS or workflow file
  (seen on #10; GitHub doesn't document it), so the PR stays BLOCKED with no `CodeQL` check. Once `CI` and `zizmor` pass
  and `gh pr checks <n>` lists no `CodeQL`, merge with `gh pr merge <n> --merge --admin`. `--admin` skips every rule, so
  never use it while a check fails or is pending (osrs-tracker/osrs-tracker-packages#11).
- A hand publish from a PR branch ships unmerged code: tell the user. Commit and push in the same session as any
  publish.
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
