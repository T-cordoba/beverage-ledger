import { Masked, Task } from '@serenity-js/core';
import { Click, Enter, Navigate } from '@serenity-js/web';
import { environment } from '../support/environment';
import { LoginForm } from '../ui/LoginForm';
import { RespectTheLoginRateLimit } from './RespectTheLoginRateLimit';
import { WaitUntilVisible } from './Waits';

export const SignIn = {
  withCredentials: (email: string, password: string) =>
    Task.where(
      `#actor inicia sesión como ${email}`,
      RespectTheLoginRateLimit(),
      Navigate.to('/login'),
      WaitUntilVisible(LoginForm.email()),
      Enter.theValue(email).into(LoginForm.email()),
      Enter.theValue(Masked.valueOf(password)).into(LoginForm.password()),
      Click.on(LoginForm.submit()),
    ),

  asTheTestUser: () => {
    const { email, password } = environment.credentials();
    return Task.where(
      '#actor inicia sesión con su cuenta',
      SignIn.withCredentials(email, password),
    );
  },
};
