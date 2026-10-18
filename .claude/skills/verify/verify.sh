#!/usr/bin/env bash
# Runs every verify check: the root Prettier check, and lint, build, type check and tests for every package in the
# workspace, all at once (none stops at another's failure). Only a package that builds against the local models
# (hiscores) waits, for models' build. Then prints each failed check's log and a summary line per check. Exits 1 when
# any check failed. Run from the checkout's root; it takes no options.
set -u
# Plain output: the logs are read by Claude, not a terminal
export NO_COLOR=1 FORCE_COLOR=0

# A worktree has no node_modules of its own; one workspace, so one install covers every package
if [ ! -d node_modules ]; then
  echo 'npm ci at the root'
  npm ci --no-audit --no-fund >/dev/null 2>&1 || { echo 'npm ci failed at the root'; exit 1; }
fi

# Each check: a name, the folder it runs in, its command and whether it waits for models' build
names=() dirs=() commands=() waits=()
add() { names+=("$1") dirs+=("$2") commands+=("$3") waits+=("${4:-}"); }

add prettier . 'npm run prettier:ci'

# The workspace order in the root package.json: models, hiscores, logger, express-metrics
for dir in $(jq -r '.workspaces[]' package.json); do
  name=${dir##*/}
  add "$name lint" "$dir" 'npm run lint'
  # Vitest doesn't type-check; tsconfig.spec.json type-checks the specs where a package has one. Never `npm test`: it's
  # watch mode.
  test='npx vitest run'
  [ -f "$dir/tsconfig.spec.json" ] && test="npx tsc -p tsconfig.spec.json && $test"
  if [ "$name" = models ]; then
    # Split, so hiscores waits only for the build, not for models' in-memory MongoDB tests
    models_build=${#names[@]}
    add 'models build' "$dir" 'npm run build'
    add 'models test' "$dir" "$test"
  elif jq -e '.devDependencies["@osrs-tracker/models"]' "$dir/package.json" >/dev/null; then
    # Builds and type-checks against the local models, whose exports point at its dist/
    add "$name build+test" "$dir" "npm run build && $test" wait
  else
    # The tests use what the build checks first
    add "$name build+test" "$dir" "npm run build && $test"
  fi
done

out=$(mktemp -d)
pids=()
run() {
  (
    start=$SECONDS
    cd "${dirs[$1]}" && bash -c "${commands[$1]}" >"$out/$1.log" 2>&1
    echo "$? $((SECONDS - start))" >"$out/$1.status"
  ) &
  pids[$1]=$!
}

for i in "${!names[@]}"; do
  [ -z "${waits[$i]}" ] && run "$i"
done
wait "${pids[$models_build]}"
for i in "${!names[@]}"; do
  [ -n "${waits[$i]}" ] && run "$i"
done
wait

summary=()
failed=0
for i in "${!names[@]}"; do
  read -r code secs <"$out/$i.status"
  line="${names[$i]} (${secs}s): ${dirs[$i]}: ${commands[$i]}"
  if [ "$code" -eq 0 ]; then
    summary+=("passed  $line")
  else
    failed=1
    summary+=("FAILED  $line")
    echo "=== ${names[$i]} failed: ${dirs[$i]}: ${commands[$i]}"
    if [ "$(wc -l <"$out/$i.log")" -gt 60 ]; then
      echo "(last 60 lines; full log: $out/$i.log)"
      tail -n 60 "$out/$i.log"
    else
      cat "$out/$i.log"
    fi
    echo
  fi
done

echo '=== Summary'
printf '%s\n' "${summary[@]}"
# Keep the logs a failure points to
[ "$failed" -eq 0 ] && rm -rf "$out"
exit "$failed"
