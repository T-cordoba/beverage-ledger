import { By, PageElement, PageElements } from '@serenity-js/web';

const ledger = () =>
  PageElement.located(By.role('table', { name: /^Movimientos confirmados de/ })).describedAs(
    'la tabla del kardex',
  );

export const KardexPage = {
  productName: () =>
    PageElement.located(By.role('heading', { level: 1 })).describedAs('el nombre del producto'),
  /** StatTile renders the value right before its label, both as paragraphs. */
  onHand: () =>
    PageElement.located(
      By.xpath('//p[normalize-space()="En existencia"]/preceding-sibling::p[1]'),
    ).describedAs('las unidades en existencia'),
  ledger,
  rows: () => PageElements.located(By.css('tbody tr')).of(ledger()).describedAs('las líneas'),
  /** Newest first, so the first row's balance (fifth column) is what is on hand now. */
  latestBalance: () =>
    PageElement.located(By.css('tbody tr:first-child td:nth-child(5)'))
      .of(ledger())
      .describedAs('el saldo de la línea más reciente'),
};
