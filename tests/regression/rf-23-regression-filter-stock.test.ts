import { expect } from 'chai';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('RF-23 regression - filter the stock levels', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('the first render shows the initial search without waiting', () => {
    const initial = 'whisky';

    const { result } = renderHook(() => useDebouncedValue(initial));

    expect(result.current, 'settled search').to.equal(initial);
  });

  it('a burst of keystrokes lets only the last one through', () => {
    const settled: string[] = [];
    const { rerender } = renderHook(
      ({ value }) => {
        const search = useDebouncedValue(value);
        settled.push(search);
        return search;
      },
      { initialProps: { value: '' } },
    );

    for (const value of ['r', 'ro', 'ron']) {
      rerender({ value });
      advance(100);
    }
    advance(300);

    expect(new Set(settled), 'searches that ever settled').to.have.all.keys('', 'ron');
    expect(settled.at(-1), 'last settled search').to.equal('ron');
  });

  it('unmounting the view drops the pending search instead of applying it later', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'whisky' },
    });
    rerender({ value: 'ron' });

    unmount();

    expect(vi.getTimerCount(), 'pending timers').to.equal(0);
  });

  it('lets an object filter through unchanged, the same reference and not a copy', () => {
    const initial = { search: '', categoryId: '' };
    const next = { search: 'ron', categoryId: 'category-1' };
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: initial },
    });

    rerender({ value: next });
    advance(300);

    expect(result.current, 'settled filters').to.equal(next);
    expect(result.current, 'settled filters').to.not.equal(initial);
  });
});
