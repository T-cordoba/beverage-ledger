import { spendRefresh } from './budget.mjs';
import { API_URL, BASE_URL } from './env.mjs';
import type { Session } from './session.mjs';

const UUID = /\/movements\/([0-9a-f-]{36})$/;

export function movementIdFrom(url: string): string {
  const match = UUID.exec(new URL(url).pathname);
  if (!match) throw new Error(`La URL ${url} no es el detalle de un movimiento.`);
  return match[1]!;
}

type CleanupResult = { id: string; before: string; status: number | null };

/**
 * Voids whatever a scenario confirmed and left confirmed, so the stock the next
 * scenario reads is the one the seed left. It runs inside the page: the refresh
 * cookie lives in the browser, and buying a token there rotates it in the same
 * cookie jar the SPA uses, so the app keeps its session afterwards.
 */
export async function voidTracked(session: Session, ids: string[]): Promise<CleanupResult[]> {
  if (ids.length === 0) return [];
  if (!(await session.page.url()).startsWith(BASE_URL)) return [];
  await spendRefresh();
  const script = `(async () => {
    const api = ${JSON.stringify(`${API_URL}/api/v1`)};
    const refresh = await fetch(api + '/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!refresh.ok) throw new Error('refresh para limpiar: ' + refresh.status);
    const { accessToken } = await refresh.json();
    const headers = { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' };
    const out = [];
    for (const id of ${JSON.stringify(ids)}) {
      const movement = await (await fetch(api + '/movements/' + id, { headers })).json();
      if (movement.status !== 'CONFIRMED') { out.push({ id, before: movement.status, status: null }); continue; }
      const cancel = await fetch(api + '/movements/' + id + '/cancel', {
        method: 'POST', headers, body: JSON.stringify({ reason: 'Limpieza de la suite Stagehand' }),
      });
      out.push({ id, before: movement.status, status: cancel.status });
    }
    return out;
  })()`;
  const results = (await session.page.evaluate(script)) as CleanupResult[];
  const failed = results.filter((r) => r.status !== null && (r.status < 200 || r.status >= 300));
  if (failed.length > 0) {
    // Loud on purpose: a silent miss leaves a confirmed movement in the ledger.
    throw new Error(`No se pudieron anular al limpiar: ${JSON.stringify(failed)}`);
  }
  return results;
}
