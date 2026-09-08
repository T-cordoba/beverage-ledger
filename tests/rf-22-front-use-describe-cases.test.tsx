import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { useDescribeCases } from '@/features/stock/quantity';
import messages from '@/i18n/messages/es.json';

describe('useDescribeCases', () => {
  const describeCases = () =>
    renderHook(() => useDescribeCases(), {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="es" messages={messages}>
          {children}
        </NextIntlClientProvider>
      ),
    }).result.current;

  it('Camino 1 - el producto se vende por unidad y no hay frase de cajas', () => {
    const describir = describeCases();

    const frase = describir(24, 1);

    expect(frase).toBeNull();
  });

  it('Camino 2 - no hay existencias y no hay frase de cajas', () => {
    const describir = describeCases();

    const frase = describir(0, 12);

    expect(frase).toBeNull();
  });

  it('Camino 3 - hay existencias pero no alcanzan para una caja', () => {
    const describir = describeCases();

    const frase = describir(5, 12);

    expect(frase).toBeNull();
  });

  it('Camino 4 - las existencias son cajas exactas', () => {
    const describir = describeCases();

    const frase = describir(24, 12);

    expect(frase).toBe('2 cajas');
  });

  it('Camino 5 - las existencias son cajas y botellas sueltas', () => {
    const describir = describeCases();

    const frase = describir(26, 12);

    expect(frase).toBe('2 cajas + 2 botellas');
  });
});
