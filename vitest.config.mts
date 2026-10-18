import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// One project per package, in the workspace order. Run from the repo root: `npx vitest run` (all of them) or
// `npx vitest run --project models`. hiscores imports the local models through its exports, so build models first.
export default defineConfig({
  test: {
    projects: ['models', 'hiscores', 'logger', 'express-metrics'].map((name) => ({
      test: {
        name,
        root: `packages/${name}`,
        include: ['src/**/*.spec.ts'],
        environment: 'node',
        // models' *.int.spec.ts start an in-memory MongoDB: download the binary once, before they start in parallel.
        // An absolute path, which knip resolves too
        globalSetup:
          name === 'models'
            ? [fileURLToPath(new URL('packages/models/src/mongodb.global-setup.ts', import.meta.url))]
            : [],
      },
    })),
  },
});
