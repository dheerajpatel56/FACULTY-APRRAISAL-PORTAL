import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
    // These suites run against the real dev database, not a fixture one, and
    // vitest runs the files in parallel. The heavier cases — the full appraisal
    // workflow, and /tracking, which computes a row per faculty across ~90
    // users — sit near vitest's 5s default when the machine is idle and tip
    // over it when the other DB-backed suites are running alongside. That is
    // load, not a hang, so the budget is stated rather than left to chance.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
