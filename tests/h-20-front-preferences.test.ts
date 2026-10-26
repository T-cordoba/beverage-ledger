import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_WIDGETS, HALF_WIDTH_WIDGETS } from '@/config/dashboard';
import {
  applyPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  type Preferences,
} from '@/features/preferences/preferences';
import { usePreferences } from '@/features/preferences/usePreferences';

/** jsdom has no matchMedia; this one reports `prefersLight` and records its listeners. */
function stubMatchMedia(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: prefersLight,
    addEventListener: vi.fn((_type: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: () => void) => listeners.delete(listener)),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return {
    query,
    listeners,
    setPrefersLight: (value: boolean) => {
      query.matches = value;
      listeners.forEach((listener) => listener());
    },
  };
}

const root = () => document.documentElement.dataset;

const guardar = (preferences: Partial<Preferences>) =>
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));

beforeEach(() => {
  window.localStorage.clear();
  delete root().theme;
  delete root().contrast;
  delete root().textScale;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('applyPreferences', () => {
  it('Camino 1 - un tema explicito se escribe tal cual en <html>', () => {
    applyPreferences({ ...DEFAULT_PREFERENCES, theme: 'light', contrast: 'high', textScale: 'xl' });

    expect(root()).toMatchObject({ theme: 'light', contrast: 'high', textScale: 'xl' });
  });

  it.each([
    ['claro', true, 'light'],
    ['oscuro', false, 'dark'],
  ])(
    'Camino 2 - el tema del sistema resuelve al tema %s del sistema operativo',
    (_caso, prefersLight, esperado) => {
      stubMatchMedia(prefersLight);

      applyPreferences({ ...DEFAULT_PREFERENCES, theme: 'system' });

      expect(root().theme).toBe(esperado);
    },
  );
});

describe('usePreferences', () => {
  it('Camino 1 - sin nada guardado devuelve las preferencias por defecto', () => {
    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('Camino 2 - lo guardado se mezcla sobre los valores por defecto', () => {
    guardar({ textScale: 'lg' });

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, textScale: 'lg' });
  });

  it('Camino 3 - lo guardado no es JSON valido y se usan los valores por defecto', () => {
    window.localStorage.setItem(PREFERENCES_KEY, '{no es json');

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('Camino 4 - el almacenamiento esta bloqueado y se usan los valores por defecto', () => {
    guardar({ contrast: 'high' });
    renderHook(() => usePreferences());
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('Camino 5 - update guarda, aplica a <html> y re-renderiza esta pestaña', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => result.current.update({ theme: 'light', contrast: 'high' }));

    expect(result.current.preferences).toMatchObject({ theme: 'light', contrast: 'high' });
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toMatchObject({
      theme: 'light',
      contrast: 'high',
      textScale: DEFAULT_PREFERENCES.textScale,
    });
    expect(root()).toMatchObject({ theme: 'light', contrast: 'high' });
  });

  it('Camino 6 - update conserva lo que no cambia', () => {
    guardar({ dashboardHidden: ['recent'] });
    const { result } = renderHook(() => usePreferences());

    act(() => result.current.update({ textScale: 'sm' }));

    expect(result.current.preferences).toMatchObject({
      textScale: 'sm',
      dashboardHidden: ['recent'],
    });
  });

  it('Camino 7 - no se puede guardar y aun asi se aplica a la pagina', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { result } = renderHook(() => usePreferences());

    act(() => result.current.update({ theme: 'light' }));

    expect(root().theme).toBe('light');
    expect(window.localStorage.getItem(PREFERENCES_KEY)).toBeNull();
  });

  it('Camino 8 - otra pestaña cambia las preferencias y esta las recibe', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      guardar({ textScale: 'xl' });
      window.dispatchEvent(new StorageEvent('storage', { key: PREFERENCES_KEY }));
    });

    expect(result.current.preferences.textScale).toBe('xl');
  });

  it('Camino 9 - con el tema del sistema sigue al sistema operativo en vivo', () => {
    const media = stubMatchMedia(false);
    guardar({ theme: 'system' });
    const { unmount } = renderHook(() => usePreferences());

    act(() => media.setPrefersLight(true));
    expect(root().theme).toBe('light');

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('Camino 10 - con un tema fijo no escucha al sistema operativo', () => {
    const media = stubMatchMedia(true);
    guardar({ theme: 'dark' });

    renderHook(() => usePreferences());

    expect(media.query.addEventListener).not.toHaveBeenCalled();
  });
});

describe('DASHBOARD_WIDGETS', () => {
  it('Camino 1 - las tarjetas de media fila son tarjetas del dashboard', () => {
    expect(DASHBOARD_WIDGETS).toEqual(expect.arrayContaining([...HALF_WIDTH_WIDGETS]));
    expect(new Set(DASHBOARD_WIDGETS).size).toBe(DASHBOARD_WIDGETS.length);
  });
});
