import { Task, notes } from '@serenity-js/core';
import { Click, Text } from '@serenity-js/web';
import { KardexPage } from '../ui/KardexPage';
import { StockPage } from '../ui/StockPage';
import { WaitUntilVisible } from './Waits';

export interface KardexNotes {
  chosenProduct: string;
}

export const OpenKardex = {
  ofTheFirstListedProduct: () =>
    Task.where(
      '#actor abre el kardex del primer producto de la lista',
      WaitUntilVisible(StockPage.productLinks().first()),
      notes<KardexNotes>().set('chosenProduct', Text.of(StockPage.productLinks().first())),
      Click.on(StockPage.productLinks().first()),
      WaitUntilVisible(KardexPage.onHand()),
      WaitUntilVisible(KardexPage.latestBalance()),
    ),
};
