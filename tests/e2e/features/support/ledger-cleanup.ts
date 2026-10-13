import { After } from '@cucumber/cucumber';
import { actorInTheSpotlight } from '@serenity-js/core';
import { VoidWhatWasLeftBehind, leftAMovementBehind } from '../../screenplay/tasks/CancelMovement';

// The scenarios that confirm a movement void it as their last step. This only
// acts when one failed before getting there, so a broken run never leaves the
// shared ledger with stock it did not have.
After({ tags: '@escribe-en-el-ledger' }, async () => {
  const actor = actorInTheSpotlight();
  if (leftAMovementBehind(actor)) await actor.attemptsTo(VoidWhatWasLeftBehind());
});
