import { Task } from '@serenity-js/core';
import { Clear, Enter } from '@serenity-js/web';
import { StockPage } from '../ui/StockPage';
import { WaitUntilVisible } from './Waits';

export const SearchStock = {
  for: (term: string) =>
    Task.where(
      `#actor busca "${term}" en las existencias`,
      WaitUntilVisible(StockPage.search()),
      Clear.theValueOf(StockPage.search()),
      Enter.theValue(term).into(StockPage.search()),
    ),
};
