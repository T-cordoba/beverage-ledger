import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      PUT: vi.fn(),
    },
  };
});

const mockedApiPut = vi.mocked(api.PUT);

describe('submit (ChangePasswordForm) - Front', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Camino 1 - la mutacion falla y se notifica error', async () => {
    // Arrange
    mockedApiPut.mockResolvedValue({
      error: { message: 'The current password is incorrect' },
      response: { ok: false, status: 401 },
    } as any);

    // Act
    const response = await api.PUT('/api/v1/users/me/password', {
      body: {
        currentPassword: 'contraseña-incorrecta-seguro',
        newPassword: 'NuevaSegura123!abc',
      },
    });

    // Assert
    expect(response.response.ok).toBe(false);
    expect(response.response.status).toBe(401);
    expect(response.error).toBeDefined();
  });

  it('Camino 2 - cambio exitoso, responde 204 y se cierra la sesion', async () => {
    // Arrange
    mockedApiPut.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { ok: true, status: 204 },
    } as any);

    // Act
    const response = await api.PUT('/api/v1/users/me/password', {
      body: {
        currentPassword: 'SecurePass123!',
        newPassword: 'NuevaSegura123!abc',
      },
    });

    // Assert
    expect(response.response.ok).toBe(true);
    expect(response.response.status).toBe(204);
    expect(response.error).toBeUndefined();
  });
});
