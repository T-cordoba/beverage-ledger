import { By, PageElement, PageElements } from '@serenity-js/web';

/** The ranking is the only list on the report page. */
const rankingRows = () => PageElements.located(By.css('main ul > li')).describedAs('el ranking');

export const ReportsPage = {
  option: (label: string) =>
    PageElement.located(By.role('button', { name: label, exact: true })).describedAs(
      `la opción "${label}"`,
    ),
  selectedOption: (label: string) =>
    PageElement.located(By.role('button', { name: label, exact: true, pressed: true })).describedAs(
      `la opción "${label}" marcada`,
    ),
  rankingRows,
  loading: () =>
    PageElement.located(By.css('[aria-label="Cargando el reporte"]')).describedAs(
      'el reporte cargando',
    ),
  /** The first figure on the right of each row: the units dispatched. */
  rankingQuantities: () =>
    PageElements.located(By.css('main ul > li > div:last-child > span:first-child')).describedAs(
      'las unidades del ranking',
    ),
  rankingPositions: () =>
    PageElements.located(By.css('main ul > li span.rounded-full')).describedAs(
      'las posiciones del ranking',
    ),
};
