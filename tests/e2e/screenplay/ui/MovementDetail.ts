import { By, PageElement, PageElements } from '@serenity-js/web';

const dialog = () => PageElement.located(By.role('dialog')).describedAs('el diálogo de anulación');

export const MovementDetail = {
  code: () =>
    PageElement.located(By.role('heading', { level: 1 })).describedAs('el código del movimiento'),
  /** The type and status badges sit together right under the code. */
  badges: () =>
    PageElement.located(By.xpath('//main//h1/following-sibling::div[1]')).describedAs(
      'el tipo y el estado del movimiento',
    ),
  linesHeading: () =>
    PageElement.located(By.role('heading', { level: 2, name: /^Líneas/ })).describedAs(
      'el encabezado de las líneas',
    ),
  /** The figure on the right of each line: "1 botella", "2 cajas"… */
  lineQuantities: () =>
    PageElements.located(By.xpath('//main//ul/li/span[last()]')).describedAs(
      'las cantidades de las líneas',
    ),
  /** Named after the label of its definition list entry, e.g. "Motivo" or "Anulado el". */
  detail: (label: string) =>
    PageElement.located(
      By.xpath(`//main//dl//dt[normalize-space()="${label}"]/following-sibling::dd[1]`),
    ).describedAs(`el dato "${label}"`),
  cancel: () =>
    PageElement.located(By.role('button', { name: 'Anular', exact: true })).describedAs(
      'el botón Anular',
    ),
  pdf: () => PageElement.located(By.role('button', { name: /PDF$/ })).describedAs('el botón PDF'),
  dialog,
  cancelReason: () =>
    PageElement.located(By.role('textbox', { name: 'Motivo', exact: true }))
      .of(dialog())
      .describedAs('el motivo de la anulación'),
  confirmCancel: () =>
    PageElement.located(By.role('button', { name: 'Anular', exact: true }))
      .of(dialog())
      .describedAs('la confirmación de la anulación'),
  keep: () =>
    PageElement.located(By.role('button', { name: 'Conservarlo', exact: true }))
      .of(dialog())
      .describedAs('el botón Conservarlo'),
  /** Field.tsx renders the error as the paragraph its control points to. */
  cancelReasonError: () =>
    PageElement.located(By.css('p.text-danger')).of(dialog()).describedAs('el error del motivo'),
};

export const MovementHistory = {
  /** Every card links its code to the movement's page. */
  codes: () =>
    PageElements.located(By.css('main article h3 a[href^="/movements/"]')).describedAs(
      'los códigos del historial',
    ),
  firstPdf: () =>
    PageElement.located(By.role('button', { name: /PDF$/ }))
      .of(PageElements.located(By.css('main article')).first())
      .describedAs('el botón PDF del primer movimiento'),
};
