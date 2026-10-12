import { By, PageElement } from '@serenity-js/web';

/** Sections of the main navigation, by the label the user reads, and where each one lands. */
export const SECTION_PATHS = {
  Panel: '/dashboard',
  Existencias: '/stock',
  Movimientos: '/movements',
  Reportes: '/reports',
} as const;

export type Section = keyof typeof SECTION_PATHS;

export const Navigation = {
  linkTo: (section: Section) =>
    PageElement.located(By.role('link', { name: section, exact: true }))
      .of(PageElement.located(By.role('navigation', { name: 'Principal' })))
      .describedAs(`el enlace "${section}" del menú`),
  pageTitle: () =>
    PageElement.located(By.role('heading', { level: 1 })).describedAs('el título de la página'),
};
