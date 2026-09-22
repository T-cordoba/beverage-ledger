import { NextResponse } from 'next/server';

/**
 * Liveness probe for the container runtime.
 *
 * The cut to beverage-ledger-api left this app without route handlers on
 * purpose, and this one is not a step back towards a local backend: an
 * orchestrator needs a probe that answers cheaply and that does not fail when
 * the API is down, which rules out both the landing and any page behind the
 * auth guard.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
