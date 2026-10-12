import { Then, When } from '@cucumber/cucumber';
import { includes, isPresent, not } from '@serenity-js/assertions';
import { type Actor, actorInTheSpotlight } from '@serenity-js/core';
import { DraftQuestions } from '../../screenplay/questions/AppQuestions';
import {
  CaptureOutbound,
  DiscardTheDraft,
  ReloadThePage,
} from '../../screenplay/tasks/CaptureOutbound';
import { waitPatiently } from '../../screenplay/tasks/Waits';

When(
  '{pronoun} captura una salida de {int} botellas sin confirmarla',
  async (actor: Actor, bottles: number) => {
    await actor.attemptsTo(CaptureOutbound.withBottles(bottles));
  },
);

When('{pronoun} recarga la página', async (actor: Actor) => {
  await actor.attemptsTo(ReloadThePage());
});

When('{pronoun} descarta el borrador', async (actor: Actor) => {
  await actor.attemptsTo(DiscardTheDraft());
});

Then('el resumen del borrador dice {string}', async (summary: string) => {
  // After a reload the draft comes back from localStorage once the session is restored.
  await actorInTheSpotlight().attemptsTo(
    waitPatiently().until(DraftQuestions.summary(), includes(summary)),
  );
});

Then('ya no queda ningún borrador pendiente', async () => {
  await actorInTheSpotlight().attemptsTo(
    waitPatiently().until(DraftQuestions.summaryBar(), not(isPresent())),
  );
});
