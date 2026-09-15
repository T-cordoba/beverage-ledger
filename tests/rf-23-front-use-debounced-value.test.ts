import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  const INICIAL = 'whisky';
  const TECLEADO = 'ron';

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const avanzar = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it('Camino 1 - el retardo llega como argumento y el valor se entrega a los 500 ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: INICIAL },
    });

    rerender({ value: TECLEADO });
    avanzar(300);

    expect(result.current).toBe(INICIAL);

    avanzar(200);

    expect(result.current).toBe(TECLEADO);
  });

  it('Camino 2 - el retardo se omite y el valor se entrega a los 300 ms por defecto', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: INICIAL },
    });

    rerender({ value: TECLEADO });
    avanzar(299);

    expect(result.current).toBe(INICIAL);

    avanzar(1);

    expect(result.current).toBe(TECLEADO);
  });
});
