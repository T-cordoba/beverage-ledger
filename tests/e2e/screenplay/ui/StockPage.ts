import { By, PageElement, PageElements } from '@serenity-js/web';

const table = () =>
  PageElement.located(By.role('table', { name: 'Existencias por producto' })).describedAs(
    'la tabla de existencias',
  );

export const StockPage = {
  search: () =>
    PageElement.located(
      By.role('searchbox', { name: 'Buscar existencias por producto' }),
    ).describedAs('la búsqueda de existencias'),
  table,
  columnHeaders: () =>
    PageElements.located(By.role('columnheader')).of(table()).describedAs('las columnas'),
  productLinks: () =>
    PageElements.located(By.css('tbody a[href^="/stock/"]'))
      .of(table())
      .describedAs('los productos listados'),
  resultCount: () =>
    PageElement.located(By.css('p'))
      .of(PageElement.located(By.role('navigation', { name: 'Paginación' })))
      .describedAs('el conteo de resultados'),
  emptyState: () =>
    PageElement.located(
      By.xpath('//main//*[text()[normalize-space()="Ningún producto coincide con esos filtros."]]'),
    ).describedAs('el aviso de que nada coincide'),
};
