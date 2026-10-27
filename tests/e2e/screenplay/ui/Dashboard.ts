import { By, PageElement, PageElements } from '@serenity-js/web';

export const Dashboard = {
  lowStockTitle: () =>
    PageElement.located(By.role('heading', { level: 2, name: 'Bajo mínimo' })).describedAs(
      'la tarjeta de bajo mínimo',
    ),
  /**
   * The shortlist is the only list on the panel whose rows link to a product's
   * stock; the recent movements link to /movements instead.
   */
  lowStockProducts: () =>
    PageElements.located(By.css('main li a[href^="/stock/"]')).describedAs(
      'los productos bajo mínimo',
    ),
  registerOutbound: () =>
    PageElement.located(By.role('link', { name: 'Registrar una salida' })).describedAs(
      'el acceso a registrar una salida',
    ),
};
