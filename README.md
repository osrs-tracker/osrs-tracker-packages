# OSRS Tracker packages

The npm packages shared by [OSRS Tracker](https://osrs-tracker.net)'s website
([osrs-tracker-web](https://github.com/osrs-tracker/osrs-tracker-web)), its
[API](https://github.com/osrs-tracker/osrs-tracker-api) and its background jobs
([osrs-tracker-aws](https://github.com/osrs-tracker/osrs-tracker-aws)). Each one lives in `packages/<name>/` with its
own README, changelog and version, and is published to npm on its own.

| Package                                                     | Version                                                                                                                               | Description                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@osrs-tracker/models`](packages/models)                   | [![npm](https://img.shields.io/npm/v/@osrs-tracker/models.svg)](https://www.npmjs.com/package/@osrs-tracker/models)                   | The shared data types (players, items, hiscores, player counts, news) used by the website, the API and the jobs, plus how hiscore snapshots are stored compactly, the skill and activity names and XP calculations. |
| [`@osrs-tracker/hiscores`](packages/hiscores)               | [![npm](https://img.shields.io/npm/v/@osrs-tracker/hiscores.svg)](https://www.npmjs.com/package/@osrs-tracker/hiscores)               | Fetches OSRS hiscores, maps them to the shared data types and compares snapshots.                                                                                                                                   |
| [`@osrs-tracker/express-metrics`](packages/express-metrics) | [![npm](https://img.shields.io/npm/v/@osrs-tracker/express-metrics.svg)](https://www.npmjs.com/package/@osrs-tracker/express-metrics) | Prometheus HTTP metrics for the website's and the API's servers.                                                                                                                                                    |
| [`@osrs-tracker/logger`](packages/logger)                   | [![npm](https://img.shields.io/npm/v/@osrs-tracker/logger.svg)](https://www.npmjs.com/package/@osrs-tracker/logger)                   | Structured JSON logs (request logs, outgoing requests, errors) for the website's and the API's servers, on pino.                                                                                                    |

## How they relate

- `hiscores` has `models` as a peer dependency: it maps Jagex's hiscores to `models`' types, and consumers install both.
  In this repo `hiscores` builds and tests against the local `models`, so build `models` first.
- `express-metrics` and `logger` stand alone, with no `@osrs-tracker/*` dependencies. The Lambdas use neither.
- Which job writes which MongoDB field, and how the data `models` describes is stored, is in osrs-tracker-aws's
  [DATA-MODEL.md](https://github.com/osrs-tracker/osrs-tracker-aws/blob/main/DATA-MODEL.md).

The packages moved here from osrs-tracker-aws on 2026-10-18, with their history (roadmap
osrs-tracker/osrs-tracker-aws#154).

## Development

One npm workspace, with one lockfile at the root:

```bash
npm ci
npm run lint
npm run build
npm run typecheck
npm test
```

Each runs every package, in workspace order (`models` first: `hiscores` builds against it). `npm test` runs one Vitest
project per package; `npx vitest run --project models` runs one. `models`' `*.int.spec.ts` tests start an in-memory
MongoDB 8.0. `npm run knip` reports unused files, dependencies and internal exports, `npm run jscpd` copy-pasted code,
and `npm run prettier:ci` checks the formatting.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for the attribution to keep when you distribute this software or a
work derived from it.
