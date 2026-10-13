import { expect } from 'chai';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { granularityFor, rangeFor, REPORT_PERIODS } from '@/features/reports/range';

const now = new Date('2026-09-01T12:00:00.000Z');
const hour = 60 * 60 * 1000;
const day = 24 * hour;
const isoInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const spanOf = ({ from, to }: { from: string; to: string }) => Date.parse(to) - Date.parse(from);

describe('RF-28 regression - consumption report range', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('every period the UI offers ends now and sends only the two fields the API accepts', () => {
    const periods = REPORT_PERIODS;

    const ranges = periods.map(rangeFor);

    for (const range of ranges) {
      expect(range, 'range').to.have.all.keys('from', 'to');
      expect(range.from, 'from').to.match(isoInstant);
      expect(range.to, 'to').to.equal(now.toISOString());
    }
  });

  it('the week covers seven days, give or take a daylight saving hour', () => {
    const period = 'week' as const;

    const range = rangeFor(period);

    expect(spanOf(range), 'week span').to.be.closeTo(7 * day, hour);
  });

  it('longer periods always reach further back', () => {
    const periods = ['week', 'month', 'year'] as const;

    const [week, month, year] = periods.map((period) => spanOf(rangeFor(period)));

    expect(month, 'month span').to.be.above(week);
    expect(year, 'year span').to.be.above(month);
    expect(year, 'year span').to.be.within(365 * day, 366 * day);
  });

  it('the chart granularity follows the period, and a year is never drawn by the day', () => {
    const periods = REPORT_PERIODS;

    const granularities = periods.map(granularityFor);

    expect(periods, 'offered periods').to.have.ordered.members(['week', 'month', 'year']);
    expect(granularities, 'granularities').to.have.ordered.members(['day', 'day', 'month']);
    expect(granularityFor('year'), 'year granularity').to.not.equal('day');
  });
});
