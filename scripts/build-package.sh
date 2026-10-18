#!/usr/bin/env bash
# Every package's `npm run build`, run from its folder: dist/cjs (osrs-tracker-api requires it), dist/esm with its
# { "type": "module" } package.json (osrs-tracker-web bundles it) and dist/types, all from the package's tsconfig.json.
# Arguments go to the types build only (models adds --declarationMap; logger and express-metrics keep their comments
# with --removeComments false).
set -euo pipefail

rm -rf dist
tsc --module CommonJS --outDir dist/cjs
tsc --module ESNext --outDir dist/esm
echo '{ "type": "module" }' > dist/esm/package.json
tsc --declaration --emitDeclarationOnly --outDir dist/types "$@"
