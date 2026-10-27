import { existsSync, readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import type { Ai } from './ai.mjs';
import { read } from './dom.mjs';
import { BASE_URL, runPath } from './env.mjs';
import { appendJsonl, log, writeJson } from './evidence.mjs';
import { voidTracked } from './ledger.mjs';
import { closeSession, openSession, signIn, type Session } from './session.mjs';

export type Ctx = {
  session: Session;
  ai: Ai;
  /** Remembers a movement the scenario confirmed, so the teardown voids it. */
  track: (movementId: string) => void;
};

type Scenario = { id: string; name: string; run: (ctx: Ctx) => Promise<void> };

const SCENARIO_TIMEOUT = 15 * 60_000;

async function screenshot(session: Session, file: string) {
  try {
    await session.page.screenshot({ path: runPath('screenshots', file), fullPage: true });
  } catch (error) {
    log(`    (sin captura ${file}: ${String(error).slice(0, 120)})`);
  }
}

async function clearDrafts(session: Session) {
  // The capture keeps its draft in localStorage, one entry per movement type: a
  // leftover line would leak into the next scenario's picker.
  if ((await session.page.url()).startsWith(BASE_URL)) await read(session.page, 'clearDrafts');
}

/**
 * One spec file = one functional requirement: a signed-in browser for the
 * whole file and its scenarios run in order, never two at a time.
 */
export function defineSuite(spec: string, title: string, scenarios: Scenario[]) {
  describe(title, () => {
    let session: Session | undefined;

    before(async () => {
      // A stopped run opens no browser: the scenarios fail on the mark below.
      if (existsSync(runPath('.detener'))) return;
      session = await openSession(spec);
      session.ai.scenario = `${spec} · login`;
      await signIn(session);
      await clearDrafts(session);
    }, { timeout: 5 * 60_000 });

    after(async () => {
      if (session) {
        try {
          writeJson(`metrics-${spec}.json`, await session.stagehand.metrics());
        } finally {
          await closeSession(session);
        }
      }
    });

    for (const scenario of scenarios) {
      test(`${scenario.id} ${scenario.name}`, { timeout: SCENARIO_TIMEOUT }, async () => {
        // Dropped by scripts/run.mjs when RAM stays too low, or by hand: fail, never skip.
        if (existsSync(runPath('.detener'))) {
          throw new Error(`Ejecución detenida antes de este escenario: ${readFileSync(runPath('.detener'), 'utf8').trim()}`);
        }
        if (!session) throw new Error('No hay sesión: falló el inicio de sesión del archivo.');
        const current = session;
        current.ai.scenario = `${scenario.id} ${scenario.name}`;
        const tracked: string[] = [];
        const started = Date.now();
        log(`\n  ▶ ${scenario.id} ${scenario.name}`);
        let error: unknown;
        try {
          await scenario.run({ session: current, ai: current.ai, track: (id) => tracked.push(id) });
          await screenshot(current, `${scenario.id}-ok.png`);
        } catch (failure) {
          error = failure;
          await screenshot(current, `${scenario.id}-FALLO.png`);
        }
        try {
          const voided = await voidTracked(current, tracked);
          if (voided.length > 0) log(`    limpieza: ${JSON.stringify(voided)}`);
          await clearDrafts(current);
        } catch (cleanup) {
          error ??= cleanup;
        }
        appendJsonl('escenarios.jsonl', {
          spec,
          id: scenario.id,
          name: scenario.name,
          status: error ? 'failed' : 'passed',
          ms: Date.now() - started,
          movements: tracked,
          error: error ? String(error instanceof Error ? error.message : error).slice(0, 1500) : undefined,
        });
        if (error) throw error;
      });
    }
  });
}
