import { Given, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, includes } from '@serenity-js/assertions';
import type { Actor } from '@serenity-js/core';
import { CurrentPage, LoginQuestions } from '../../screenplay/questions/AppQuestions';
import { GoTo } from '../../screenplay/tasks/GoTo';
import { SignIn } from '../../screenplay/tasks/SignIn';
import { WaitUntilVisible, waitPatiently } from '../../screenplay/tasks/Waits';
import { LoginForm } from '../../screenplay/ui/LoginForm';
import type { Section } from '../../screenplay/ui/Navigation';

Given('{actor} ingresó a la aplicación', async (actor: Actor) => {
  await actor.attemptsTo(
    SignIn.asTheTestUser(),
    waitPatiently().until(CurrentPage.path(), equals('/dashboard')),
  );
});

When('{actor} inicia sesión con su cuenta', async (actor: Actor) => {
  await actor.attemptsTo(SignIn.asTheTestUser());
});

When(
  '{actor} inicia sesión con correo {string} y contraseña {string}',
  async (actor: Actor, email: string, password: string) => {
    await actor.attemptsTo(SignIn.withCredentials(email, password));
  },
);

When('{pronoun} abre la sección {string}', async (actor: Actor, section: Section) => {
  await actor.attemptsTo(GoTo.section(section));
});

Then('{pronoun} llega a la ruta {string}', async (actor: Actor, path: string) => {
  await actor.attemptsTo(waitPatiently().until(CurrentPage.path(), equals(path)));
});

Then('{pronoun} sigue en la ruta {string}', async (actor: Actor, path: string) => {
  await actor.attemptsTo(Ensure.that(CurrentPage.path(), equals(path)));
});

Then('{pronoun} ve el aviso {string}', async (actor: Actor, message: string) => {
  await actor.attemptsTo(
    WaitUntilVisible(LoginForm.alert()),
    Ensure.that(LoginQuestions.alert(), includes(message)),
  );
});

Then('{pronoun} ve el título {string}', async (actor: Actor, title: string) => {
  await actor.attemptsTo(waitPatiently().until(CurrentPage.title(), equals(title)));
});
