import { By, PageElement, PageElements } from '@serenity-js/web';

export const MovementCapture = {
  /** The first product whose stock still allows one more bottle out. */
  firstAvailableAddBottle: () =>
    PageElements.located(By.role('button', { name: 'Añadir botella', disabled: false }))
      .first()
      .describedAs('el primer botón "Añadir botella" habilitado'),
  draftSummary: () =>
    PageElement.located(By.role('button', { name: /producto.*unidad/ })).describedAs(
      'el resumen del borrador',
    ),
  discard: () =>
    PageElement.located(By.role('button', { name: 'Descartar', exact: true })).describedAs(
      'el botón Descartar',
    ),
  confirmDiscard: () =>
    PageElement.located(By.role('button', { name: 'Descartar', exact: true }))
      .of(PageElement.located(By.role('dialog')))
      .describedAs('la confirmación de descartar'),
};
