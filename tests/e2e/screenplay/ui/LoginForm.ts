import { By, PageElement } from '@serenity-js/web';

// A password input has no ARIA role, so the two fields go by type rather than by role.
export const LoginForm = {
  email: () => PageElement.located(By.css('input[type="email"]')).describedAs('el campo de correo'),
  password: () =>
    PageElement.located(By.css('input[type="password"]')).describedAs('el campo de contraseña'),
  submit: () =>
    PageElement.located(By.role('button', { name: 'Entrar' })).describedAs('el botón Entrar'),
  // Scoped to the form: Next mounts its own role="alert" route announcer on every page.
  alert: () =>
    PageElement.located(By.css('form [role="alert"]')).describedAs('el aviso del formulario'),
};
