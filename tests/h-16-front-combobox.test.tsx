import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/components/ui/Combobox';
import messages from '@/i18n/messages/es.json';

const OPCIONES = [
  { value: 'vodka', label: 'Vodka' },
  { value: 'ron', label: 'Ron' },
  { value: 'tequila', label: 'Tequila Añejo' },
];

function abrir(onValueChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <Combobox
        value="vodka"
        onValueChange={onValueChange}
        options={OPCIONES}
        aria-label="Categoria"
      />
    </NextIntlClientProvider>,
  );
  fireEvent.click(screen.getByRole('combobox', { name: 'Categoria' }));
  return { onValueChange, filtro: screen.getByRole('searchbox') };
}

describe('Combobox', () => {
  beforeAll(() => {
    // jsdom does not lay out, so it has no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(cleanup);

  it('Camino 1 - al abrir el foco queda en el filtro', () => {
    const { filtro } = abrir();

    expect(document.activeElement).toBe(filtro);
  });

  it('Camino 2 - flechas y Enter en el filtro eligen la opcion activa una sola vez', () => {
    const { onValueChange, filtro } = abrir();

    fireEvent.keyDown(filtro, { key: 'ArrowDown' });
    expect(filtro.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Ron' }).id,
    );
    fireEvent.keyDown(filtro, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('ron');
  });

  it('Camino 3 - el filtro ignora acentos y Enter elige la unica coincidencia', () => {
    const { onValueChange, filtro } = abrir();

    fireEvent.change(filtro, { target: { value: 'anejo' } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Tequila Añejo',
    ]);
    fireEvent.keyDown(filtro, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('tequila');
  });

  it('Camino 4 - hacer clic en una opcion la elige una sola vez', () => {
    const { onValueChange } = abrir();

    fireEvent.click(screen.getByRole('option', { name: 'Ron' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('ron');
  });

  it.each(['Enter', ' '])(
    'Camino 5 - la tecla "%s" sobre una opcion la elige una sola vez',
    (key) => {
      const { onValueChange } = abrir();

      fireEvent.keyDown(screen.getByRole('option', { name: 'Tequila Añejo' }), { key });

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith('tequila');
    },
  );

  it('Camino 6 - otra tecla sobre una opcion no elige nada', () => {
    const { onValueChange } = abrir();

    fireEvent.keyDown(screen.getByRole('option', { name: 'Ron' }), { key: 'a' });

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
