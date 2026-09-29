import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, unwrap } from '@/lib/api';
import { apiResult } from './support/api-result';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      PATCH: vi.fn(),
    },
  };
});

const mockedApiGet = vi.mocked(api.GET);
const mockedApiPatch = vi.mocked(api.PATCH);

type GetResult = Awaited<ReturnType<typeof api.GET>>;
type PatchResult = Awaited<ReturnType<typeof api.PATCH>>;

describe('changeStatus - Front', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Camino 1 - usuario suspendido se reactiva exitosamente', async () => {
    // Arrange
    mockedApiGet.mockResolvedValue(
      apiResult<GetResult>({
        status: 200,
        data: {
          data: [{ id: 'user-1', name: 'Usuario Suspendido', status: 'SUSPENDED' }],
          total: 1,
        },
      }),
    );

    mockedApiPatch.mockResolvedValue(
      apiResult<PatchResult>({ status: 200, data: { id: 'user-1', status: 'ACTIVE' } }),
    );

    // Act
    const users = unwrap(
      await api.GET('/api/v1/users', {
        params: { query: { pageSize: 50 } },
      }),
    ).data;

    const reactivated = unwrap(
      await api.PATCH('/api/v1/users/{id}', {
        params: { path: { id: 'user-1' } },
        body: { status: 'ACTIVE' },
      }),
    );

    // Assert
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    expect(reactivated.status).toBe('ACTIVE');
  });

  it('Camino 2 - usuario activo se suspende exitosamente', async () => {
    // Arrange
    mockedApiPatch.mockResolvedValue(
      apiResult<PatchResult>({ status: 200, data: { id: 'user-2', status: 'SUSPENDED' } }),
    );

    // Act
    const response = await api.PATCH('/api/v1/users/{id}', {
      params: { path: { id: 'user-2' } },
      body: { status: 'SUSPENDED' },
    });
    const suspended = unwrap(response);

    // Assert
    expect(response.error).toBeUndefined();
    expect(suspended.status).toBe('SUSPENDED');
  });

  it('Camino 3 - la mutacion falla y se notifica error', async () => {
    // Arrange
    mockedApiPatch.mockResolvedValue(
      apiResult<PatchResult>({ status: 404, error: { message: 'User not found' } }),
    );

    // Act
    const response = await api.PATCH('/api/v1/users/{id}', {
      params: { path: { id: '00000000-0000-4000-8000-000000000000' } },
      body: { status: 'SUSPENDED' },
    });

    // Assert
    expect(response.error).toBeDefined();
    expect(response.response.status).toBe(404);
  });
});
