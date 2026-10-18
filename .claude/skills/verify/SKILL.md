---
name: verify
description:
  Runs osrs-tracker-packages' verify checks (prettier, lint, type check, build, tests) for every package and reports
  each one's result. Use right before a commit, and whenever asked to verify the repo.
---

# verify

Run the script from the checkout's root (the worktree, not the main checkout), in one Bash call:

```bash
.claude/skills/verify/verify.sh
```

It takes no options: four small packages, so it checks all of them on every run, as CI does, whatever changed.

A worktree has no `node_modules` of its own: the script first runs `npm ci` at the root when it lacks one (one
workspace, so one install covers every package).

It then runs every check at once (about 4 s), never stopping at a failure:

1. Repo root: `npm run prettier:ci` and `npm run knip`
2. Each package in `packages/`: `npm run lint -w packages/<name>`, as its own check
3. `models`: `npm run build -w packages/models`, and on its own `npm run typecheck -w packages/models` and
   `npx vitest run --project models` (its `*.int.spec.ts` tests start an in-memory MongoDB 8.0)
4. Each other package, as one check in this order (its `npm run build` is `tsc`, so it type-checks):
   - `hiscores`: build, `typecheck`, then `npx vitest run --project hiscores`. It builds and type-checks against the
     local `models`, whose `exports` point at `dist/`, so it starts once `models`' build has finished.
   - `logger`, `express-metrics`: build, then `npx vitest run --project <name>`

Every check runs from the root: the Vitest projects are in the root `vitest.config.mts`. Never run `vitest` without
`run`: it's watch mode.

It prints each failed check's log (the last 60 lines of a long one, with the full log's path), then a `passed`/`FAILED`
line per check with its folder, command and seconds, and exits 1 when any failed.

## Report

One line per check: folder, command, passed or failed, quoting the relevant errors for each failure. Never claim a pass
without the script's output. Fix every failure in one round, then run the script again: `npm run prettier` and
`npm run lint -w packages/<name> -- --fix` fix what they can; fix the rest by hand. When `models build` fails, fix it
first: `hiscores` fails with it. Don't commit while a check fails, and don't drop a check to save time: the push gate
covers only lint and Prettier.
