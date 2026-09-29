import { expect } from 'chai';
import { describe, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PAGE_SIZES, rowsOnPage } from '@/lib/hooks/pagination';

describe('RF-24 regression - product kardex pagination', () => {
  it('an empty kardex still reserves one skeleton row', () => {
    const total = 0;

    const rows = rowsOnPage(1, 10, total);

    expect(rows, 'skeleton rows').to.equal(1);
  });

  it('the pages of a kardex add up to its total', () => {
    const total = 25;
    const pages = [1, 2, 3];

    const rows = pages.map((page) => rowsOnPage(page, 10, total));

    expect(rows, 'rows per page').to.have.ordered.members([10, 10, 5]);
    expect(rows, 'rows per page').to.satisfy(
      (perPage: number[]) => perPage.reduce((sum, count) => sum + count, 0) === total,
    );
  });

  it('never asks for fewer than one row or more than a page, whatever the total', () => {
    const totals = [0, 1, 9, 10, 11, 99, 100, 101, 1_000];

    const rows = PAGE_SIZES.flatMap((pageSize) =>
      totals.flatMap((total) =>
        [1, 2, 50].map((page) => ({ pageSize, count: rowsOnPage(page, pageSize, total) })),
      ),
    );

    for (const { pageSize, count } of rows) {
      expect(count, `rows for a page of ${pageSize}`).to.be.within(1, pageSize);
    }
  });

  it('only offers page sizes the API accepts', () => {
    const apiMaximum = 100;

    const offered = [...PAGE_SIZES];

    expect(MAX_PAGE_SIZE, 'largest page').to.equal(apiMaximum);
    expect(DEFAULT_PAGE_SIZE, 'default page size').to.be.oneOf(offered);
    expect(Math.max(...offered), 'largest offered').to.be.at.most(apiMaximum);
  });
});
