import { type Answerable, Question } from '@serenity-js/core';
import { By, PageElement, PageElements } from '@serenity-js/web';

const dialog = () => PageElement.located(By.role('dialog')).describedAs('el diálogo');

/** The card in the picker that carries this product's steppers. */
const productCard = (productName: Answerable<string>) =>
  PageElement.located(
    By.xpath(
      // A product name can hold an apostrophe, so the literal goes in double quotes.
      Question.about(
        'la tarjeta del producto',
        async (actor) =>
          `//main//li[.//h3[normalize-space()="${await actor.answer(productName)}"]]`,
      ),
    ),
  ).describedAs('la tarjeta del producto elegido');

export const MovementRegister = {
  /** The four ways in from the panel, one link per type the session may record. */
  entryPoint: (action: string) =>
    PageElement.located(By.role('link', { name: action, exact: true })).describedAs(
      `el acceso a "${action}"`,
    ),
  /**
   * Only rendered once the picker knows what is on hand at the origin, and only
   * for the movements that take stock out. Until then every stepper is enabled.
   */
  onHandFigures: () =>
    PageElements.located(
      By.xpath('//main//li/p[contains(normalize-space(), "en existencia")]'),
    ).describedAs('las existencias de cada producto en el selector'),
  /** The first card whose "Añadir botella" can still be pressed. */
  firstAvailableCardName: () =>
    PageElement.located(
      By.xpath('(//main//li[.//button[@aria-label="Añadir botella" and not(@disabled)]])[1]//h3'),
    ).describedAs('el nombre del primer producto que se puede añadir'),
  productCard,
  addBottleOn: (productName: Answerable<string>) =>
    PageElement.located(By.role('button', { name: 'Añadir botella' }))
      .of(productCard(productName))
      .describedAs('su botón "Añadir botella"'),
  onHandOn: (productName: Answerable<string>) =>
    PageElement.located(By.xpath('./p[contains(normalize-space(), "en existencia")]'))
      .of(productCard(productName))
      .describedAs('lo que tiene en existencia'),
  /** The trigger of a location select, named by its field label: Bodega, Desde or Hacia. */
  location: (label: string) =>
    PageElement.located(By.role('combobox', { name: label, exact: true })).describedAs(
      `el selector "${label}"`,
    ),
  defaultLocationOption: () =>
    PageElement.located(By.role('option', { name: /\(por defecto\)$/ })).describedAs(
      'la bodega por defecto',
    ),
  /** The open list of locations, placeholder first. */
  locationOptions: () =>
    PageElements.located(By.role('option')).describedAs('las bodegas del selector abierto'),
  reason: () =>
    PageElement.located(By.role('textbox', { name: 'Motivo', exact: true })).describedAs(
      'el campo Motivo',
    ),
  /** The sticky bar's own button, the one that opens the confirmation. */
  confirm: () =>
    PageElement.located(By.role('button', { name: 'Confirmar', exact: true })).describedAs(
      'el botón Confirmar de la barra',
    ),
  confirmInDialog: () =>
    PageElement.located(By.role('button', { name: 'Confirmar', exact: true }))
      .of(dialog())
      .describedAs('la confirmación del movimiento'),
  goBackInDialog: () =>
    PageElement.located(By.role('button', { name: 'Volver', exact: true }))
      .of(dialog())
      .describedAs('el botón Volver de la confirmación'),
  dialog,
  /** The warning under the bar that lists what keeps the movement from confirming. */
  blockers: () =>
    PageElement.located(By.css('main [role="alert"]')).describedAs(
      'el aviso de lo que falta para confirmar',
    ),
};
