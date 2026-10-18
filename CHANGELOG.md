# Changelog

Changes to CI, tooling and the repo itself. Package changes are logged in each package's own
`packages/<name>/CHANGELOG.md`. Housekeeping (tooling, CI) is logged on purpose, because sessions read this as the
repo's history; doc-only changes are not.

## 2026-10-18

- CI: one workflow checks every package on each push (lint, Vitest, spec type-check, build, and a load check of the
  packed tarball with `require` and `import`), plus Prettier, a local link check and zizmor, with Dependabot keeping the
  action refs current, so the packages keep the checks they had in osrs-tracker-aws (issue
  osrs-tracker/osrs-tracker-packages#2).
