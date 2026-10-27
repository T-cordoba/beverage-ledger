import { Then, When } from '@cucumber/cucumber';
import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor, Question, actorInTheSpotlight } from '@serenity-js/core';
import { ReportQuestions } from '../../screenplay/questions/AppQuestions';
import { ChangeReport } from '../../screenplay/tasks/ChangeReport';

const consecutiveFromOne = Question.about('una numeración 1, 2, 3… sin saltos', async (actor) =>
  (await actor.answer(ReportQuestions.positions())).map((_, index) => index + 1),
);

const sortedDescending = Question.about(
  'las mismas unidades ordenadas de mayor a menor',
  async (actor) => [...(await actor.answer(ReportQuestions.quantities()))].sort((a, b) => b - a),
);

When('{pronoun} elige {string} en el reporte', async (actor: Actor, option: string) => {
  await actor.attemptsTo(ChangeReport.to(option));
});

Then('el ranking está numerado desde 1 sin saltos', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(ReportQuestions.positions(), equals(consecutiveFromOne)),
  );
});

Then('las unidades del ranking van de mayor a menor', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(ReportQuestions.quantities(), equals(sortedDescending)),
  );
});
