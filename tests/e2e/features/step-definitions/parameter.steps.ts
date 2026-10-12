import { defineParameterType } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';

defineParameterType({
  name: 'actor',
  regexp: /[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/,
  transformer: (name: string) => actorCalled(name),
});

defineParameterType({
  name: 'pronoun',
  regexp: /él|ella|elle/,
  transformer: () => actorInTheSpotlight(),
});
