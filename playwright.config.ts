import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3020);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const E2E_RESPUESTAS_TABLE = process.env.SUPABASE_RESPUESTAS_TABLE ?? "respuestas_e2e";
const E2E_RESPUESTAS_BLOQUEADAS_TABLE =
  process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE ?? "respuestas_bloqueadas_e2e";

// Ensure Playwright tests and the Next.js webServer use isolated E2E tables by default.
process.env.SUPABASE_RESPUESTAS_TABLE = E2E_RESPUESTAS_TABLE;
process.env.SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE = E2E_RESPUESTAS_BLOQUEADAS_TABLE;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    env: {
      ...process.env,
      SUPABASE_RESPUESTAS_TABLE: E2E_RESPUESTAS_TABLE,
      SUPABASE_RESPUESTAS_BLOQUEADAS_TABLE: E2E_RESPUESTAS_BLOQUEADAS_TABLE,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
