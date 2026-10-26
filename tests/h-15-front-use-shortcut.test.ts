import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHORTCUTS } from '@/config/shortcuts';
import { useShortcut } from '@/lib/hooks/useShortcut';
import messages from '@/i18n/messages/es.json';

const pulsar = (init: KeyboardEventInit, target: Element = document.body) =>
  fireEvent.keyDown(target, init);

describe('useShortcut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Camino 1 - la tecla coincide y se ejecuta el atajo sin la accion por defecto', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut('/', handler));

    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
  ])('Camino 2 - mod acepta %s', (_tecla, modificador) => {
    const handler = vi.fn();
    renderHook(() => useShortcut('mod+z', handler));

    pulsar({ key: 'z', ...modificador });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['falta el modificador', 'mod+z', { key: 'z' }],
    ['sobra el modificador', '/', { key: '/', ctrlKey: true }],
    ['se pulsa Alt', 'mod+z', { key: 'z', ctrlKey: true, altKey: true }],
    ['el combo pide Shift y no se pulsa', 'mod+shift+z', { key: 'z', ctrlKey: true }],
    ['mod sin Shift no acepta Shift', 'mod+z', { key: 'Z', ctrlKey: true, shiftKey: true }],
    ['la tecla es otra', 'mod+z', { key: 'x', ctrlKey: true }],
  ])('Camino 3 - %s y el atajo no se ejecuta', (_caso, combo, init) => {
    const handler = vi.fn();
    renderHook(() => useShortcut(combo, handler));

    pulsar(init);

    expect(handler).not.toHaveBeenCalled();
  });

  it('Camino 4 - Shift no se exige cuando el combo no lo nombra y no lleva mod', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut('?', handler));

    pulsar({ key: '?', shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Camino 5 - cualquiera de una lista de combos ejecuta el atajo', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut(['mod+y', 'mod+shift+z'], handler));

    pulsar({ key: 'y', ctrlKey: true });
    pulsar({ key: 'Z', ctrlKey: true, shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['un input', () => document.createElement('input')],
    ['un textarea', () => document.createElement('textarea')],
    ['un select', () => document.createElement('select')],
    [
      'un elemento editable',
      () => {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        // jsdom does not derive isContentEditable from the attribute.
        Object.defineProperty(div, 'isContentEditable', { value: true });
        return div;
      },
    ],
  ])('Camino 6 - se escribe en %s y el atajo se ignora', (_campo, crear) => {
    const handler = vi.fn();
    const campo = document.body.appendChild(crear());
    renderHook(() => useShortcut('/', handler));

    pulsar({ key: '/' }, campo);

    expect(handler).not.toHaveBeenCalled();
  });

  it('Camino 7 - inFields ejecuta el atajo aunque se escriba en un campo', () => {
    const handler = vi.fn();
    const campo = document.body.appendChild(document.createElement('textarea'));
    renderHook(() => useShortcut('mod+enter', handler, { inFields: true }));

    pulsar({ key: 'Enter', ctrlKey: true }, campo);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Camino 8 - deshabilitado no escucha el teclado', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut('/', handler, { enabled: false }));

    pulsar({ key: '/' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('Camino 9 - al desmontar deja de escuchar el teclado', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useShortcut('/', handler));

    unmount();
    pulsar({ key: '/' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('Camino 10 - se ejecuta el handler mas reciente sin volver a suscribirse', () => {
    const primero = vi.fn();
    const segundo = vi.fn();
    const { rerender } = renderHook(({ handler }) => useShortcut('/', handler), {
      initialProps: { handler: primero },
    });

    rerender({ handler: segundo });
    pulsar({ key: '/' });

    expect(primero).not.toHaveBeenCalled();
    expect(segundo).toHaveBeenCalledTimes(1);
  });
});

describe('SHORTCUTS', () => {
  it('Camino 1 - cada atajo listado tiene su texto en el menu de ayuda', () => {
    const textos: Record<string, string> = messages.help.menu.shortcuts;

    for (const { action } of SHORTCUTS) {
      expect(textos[action], action).toEqual(expect.any(String));
    }
  });
});
