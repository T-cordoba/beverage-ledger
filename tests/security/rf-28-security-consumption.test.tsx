import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCESS_TOKEN,
  AppProviders,
  XSS_PAYLOAD,
  answer,
  errorBody,
  injectedMarkup,
  loadClientUnderTest,
  queryClient,
  routeAnswers,
  session,
} from './support/security-harness';

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ can: (permission: string) => auth.permissions.includes(permission) }),
}));

const { fetchMock, storeSession, forgetSession, getAccessToken } = await loadClientUnderTest();
const { PermissionGate } = await import('@/features/auth/PermissionGate');
const { ConsumptionReportView } = await import('@/features/reports/ConsumptionReportView');

const RANGE = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' };
const SUMMARY = {
  range: RANGE,
  movements: 4,
  inboundMovements: 1,
  outboundMovements: 3,
  adjustmentMovements: 0,
  unitsIn: 24,
  unitsOut: 10,
  unitsAdjusted: 0,
  productsMoved: 2,
  unitsOnHand: 14,
  activeProducts: 2,
  productsBelowMinimum: 0,
};

function serveReport(
  rows: { id: string; name: string; quantityBase: number; movementCount: number }[],
) {
  routeAnswers(fetchMock, {
    '/api/v1/reports/consumption': answer(200, { range: RANGE, groupBy: 'product', data: rows }),
    '/api/v1/reports/summary': answer(200, SUMMARY),
  });
}

function renderGatedReport() {
  return render(
    <AppProviders client={queryClient()}>
      <PermissionGate permission="report:read" title="No puedes ver los reportes.">
        <ConsumptionReportView />
      </PermissionGate>
    </AppProviders>,
  );
}

describe('RF-28 Security - Reporte de consumo', () => {
  afterEach(cleanup);

  beforeEach(() => {
    fetchMock.mockReset();
    forgetSession();
    storeSession(session());
    auth.permissions = [];
  });

  it('sin report:read la vista no se monta y no sale ninguna petición a /reports', () => {
    // Arrange
    serveReport([]);

    // Act
    renderGatedReport();

    // Assert
    expect(screen.getByText('No puedes ver los reportes.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con report:read la vista se monta y pide el consumo y el resumen', async () => {
    // Arrange
    auth.permissions = ['report:read'];
    serveReport([]);

    // Act
    renderGatedReport();

    // Assert
    expect(await screen.findByText('No se despachó nada en este periodo.')).toBeTruthy();
    const paths = fetchMock.mock.calls.map(
      ([request]) => new URL((request as Request).url).pathname,
    );
    expect(paths).toContain('/api/v1/reports/consumption');
    expect(paths).toContain('/api/v1/reports/summary');
  });

  it('un nombre de grupo con HTML hostil se pinta como texto en el ranking', async () => {
    // Arrange
    auth.permissions = ['report:read'];
    serveReport([{ id: 'p-1', name: XSS_PAYLOAD, quantityBase: 10, movementCount: 3 }]);

    // Act
    const { container } = renderGatedReport();

    // Assert
    expect((await screen.findAllByText(XSS_PAYLOAD)).length).toBeGreaterThan(0);
    expect(injectedMarkup(container)).toBe(false);
  });

  it('si la API niega el reporte (403) se muestra el error y la sesión se conserva', async () => {
    // Arrange
    auth.permissions = ['report:read'];
    routeAnswers(fetchMock, {
      '/api/v1/reports/consumption': answer(
        403,
        errorBody(403, 'Forbidden', 'Forbidden resource', '/api/v1/reports/consumption'),
      ),
      '/api/v1/reports/summary': answer(200, SUMMARY),
    });

    // Act
    renderGatedReport();

    // Assert
    expect(await screen.findByText('No se pudo cargar el reporte.')).toBeTruthy();
    expect(getAccessToken()).toBe(ACCESS_TOKEN);
  });
});
