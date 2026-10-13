import { Then, When, defineParameterType } from '@cucumber/cucumber';
import {
  Ensure,
  equals,
  includes,
  isGreaterThan,
  isPresent,
  not,
  startsWith,
} from '@serenity-js/assertions';
import { type Actor, Question, actorInTheSpotlight, notes } from '@serenity-js/core';
import { Attribute, Click, Enter } from '@serenity-js/web';
import {
  CaptureQuestions,
  LedgerQuestions,
  MovementQuestions,
  ReceiptQuestions,
} from '../../screenplay/questions/MovementQuestions';
import {
  CancelMovement,
  OpenTheCancellation,
  SubmitTheCancellation,
} from '../../screenplay/tasks/CancelMovement';
import { DownloadTheReceipt } from '../../screenplay/tasks/DownloadReceipt';
import {
  OpenTheLatestMovement,
  RememberTheLatestMovement,
} from '../../screenplay/tasks/OpenMovement';
import {
  AddBottles,
  ChooseLocation,
  type MovementKind,
  OpenTheCapture,
  RegisterMovement,
} from '../../screenplay/tasks/RegisterMovement';
import { NoteTheStock } from '../../screenplay/tasks/NoteTheStock';
import { PressAnyway } from '../../screenplay/tasks/PressAnyway';
import { RequestTheReceipt } from '../../screenplay/tasks/RequestTheReceipt';
import { UseTheApi } from '../../screenplay/tasks/UseTheApi';
import { WaitUntilPresent, WaitUntilVisible, waitPatiently } from '../../screenplay/tasks/Waits';
import { MovementDetail, MovementHistory } from '../../screenplay/ui/MovementDetail';
import { MovementRegister } from '../../screenplay/ui/MovementRegister';

defineParameterType({
  name: 'kind',
  regexp: /salida|entrada|traspaso|ajuste/,
  transformer: (kind: string) => kind as MovementKind,
});

interface CaptureNotes {
  captureKind: MovementKind;
}

/** Outbound and transfer take stock out, so their picker stops at what is on hand. */
const isCapped = (kind: MovementKind) => kind === 'salida' || kind === 'traspaso';

When(
  '{pronoun} registra un(a) {kind} de {int} botella(s)',
  async (actor: Actor, kind: MovementKind, bottles: number) => {
    await actor.attemptsTo(RegisterMovement.of(kind, bottles));
  },
);

When(
  '{pronoun} registró un(a) {kind} de {int} botella(s)',
  async (actor: Actor, kind: MovementKind, bottles: number) => {
    await actor.attemptsTo(RegisterMovement.of(kind, bottles));
  },
);

When(
  '{pronoun} registra un(a) {kind} de {int} botella(s) con el motivo {string}',
  async (actor: Actor, kind: MovementKind, bottles: number, reason: string) => {
    await actor.attemptsTo(RegisterMovement.of(kind, bottles, { reason }));
  },
);

When('{pronoun} abre la captura de {kind}', async (actor: Actor, kind: MovementKind) => {
  await actor.attemptsTo(notes<CaptureNotes>().set('captureKind', kind), OpenTheCapture.of(kind));
});

When(
  '{pronoun} abre la captura de {kind} en la bodega por defecto',
  async (actor: Actor, kind: MovementKind) => {
    await actor.attemptsTo(
      notes<CaptureNotes>().set('captureKind', kind),
      OpenTheCapture.of(kind),
      ChooseLocation.defaultAs('Bodega'),
    );
  },
);

When(
  '{pronoun} añade {int} botella(s) del primer producto disponible',
  async (actor: Actor, bottles: number) => {
    const kind = await actor.answer(notes<CaptureNotes>().get('captureKind'));
    await actor.attemptsTo(
      AddBottles.ofTheFirstAvailableProduct(bottles, { capped: isCapped(kind) }),
    );
  },
);

When('{pronoun} escribe el motivo {string}', async (actor: Actor, reason: string) => {
  await actor.attemptsTo(WaitUntilVisible(MovementRegister.reason()));
  // An empty example stands for leaving the field as it is.
  if (reason) await actor.attemptsTo(Enter.theValue(reason).into(MovementRegister.reason()));
});

When('{pronoun} intenta confirmar el movimiento', async (actor: Actor) => {
  await actor.attemptsTo(
    Ensure.that(Attribute.called('aria-disabled').of(MovementRegister.confirm()), equals('true')),
    PressAnyway.the(MovementRegister.confirm()),
  );
});

When('{pronoun} pide confirmar el movimiento pero vuelve atrás', async (actor: Actor) => {
  await actor.attemptsTo(
    Click.on(MovementRegister.confirm()),
    WaitUntilVisible(MovementRegister.goBackInDialog()),
    Click.on(MovementRegister.goBackInDialog()),
    waitPatiently().until(MovementRegister.dialog(), not(isPresent())),
  );
});

Then('a ese producto le queda una unidad menos de las que tiene en existencia', async () => {
  const lessOne = Question.about(
    'una unidad menos de lo que hay en existencia',
    async (actor) => (await actor.answer(CaptureQuestions.onHand())) - 1,
  );

  await actorInTheSpotlight().attemptsTo(
    Ensure.that(CaptureQuestions.onHand(), isGreaterThan(0)),
    waitPatiently().until(CaptureQuestions.left(), equals(lessOne)),
  );
});

Then('el aviso de lo que falta dice {string}', async (message: string) => {
  // Present, not visible: a failed attempt focuses the offending field higher up,
  // which leaves the alert under the sticky bar and out of the viewport.
  await actorInTheSpotlight().attemptsTo(
    WaitUntilPresent(MovementRegister.blockers()),
    Ensure.that(CaptureQuestions.blockers(), includes(message)),
  );
});

Then(
  '{pronoun} ve el movimiento de tipo {string} en estado {string}',
  async (actor: Actor, type: string, status: string) => {
    await actor.attemptsTo(
      waitPatiently().until(MovementQuestions.badges(), includes(status)),
      Ensure.that(MovementQuestions.badges(), includes(type.toLocaleLowerCase('es'))),
      Ensure.that(MovementQuestions.code(), startsWith('MOV-')),
    );
  },
);

Then('las líneas del movimiento son {string}', async (quantity: string) => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(MovementQuestions.lineQuantities(), equals([quantity])),
  );
});

Then('el movimiento tiene {int} líneas', async (count: number) => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(MovementQuestions.linesHeading(), equals(`Líneas (${count})`)),
  );
});

Then('el dato {string} del movimiento es {string}', async (label: string, value: string) => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(MovementQuestions.detail(label), equals(value)),
  );
});

Then('el dato {string} del movimiento aparece', async (label: string) => {
  await actorInTheSpotlight().attemptsTo(
    waitPatiently().until(MovementDetail.detail(label), isPresent()),
  );
});

Then('el movimiento ya no ofrece anularlo', async () => {
  await actorInTheSpotlight().attemptsTo(Ensure.that(MovementDetail.cancel(), not(isPresent())));
});

Then('el código del movimiento no cambió', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(MovementQuestions.code(), equals(MovementQuestions.notedCode())),
  );
});

When(
  '{pronoun} anula el movimiento con el motivo {string}',
  async (actor: Actor, reason: string) => {
    await actor.attemptsTo(CancelMovement.withReason(reason));
  },
);

When(
  '{pronoun} consulta en la API las existencias del producto del movimiento',
  async (actor: Actor) => {
    await actor.attemptsTo(NoteTheStock.ofTheMovementProduct());
  },
);

Then('las existencias de ese producto en la API cambiaron en {int}', async (change: number) => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(LedgerQuestions.stockChange(), equals(change)),
  );
});

When('{pronoun} intenta anular el movimiento sin escribir un motivo', async (actor: Actor) => {
  await actor.attemptsTo(OpenTheCancellation(), SubmitTheCancellation());
});

Then('el motivo de la anulación dice {string}', async (message: string) => {
  await actorInTheSpotlight().attemptsTo(
    waitPatiently().until(MovementQuestions.cancelReasonError(), includes(message)),
  );
});

When('{pronoun} decide conservar el movimiento', async (actor: Actor) => {
  await actor.attemptsTo(
    Click.on(MovementDetail.keep()),
    waitPatiently().until(MovementDetail.dialog(), not(isPresent())),
  );
});

When('{pronoun} abre el movimiento más reciente del historial', async (actor: Actor) => {
  await actor.attemptsTo(OpenTheLatestMovement());
});

When('{pronoun} anota el movimiento más reciente del historial', async (actor: Actor) => {
  await actor.attemptsTo(RememberTheLatestMovement());
});

When('{pronoun} descarga el comprobante del movimiento', async (actor: Actor) => {
  await actor.attemptsTo(DownloadTheReceipt.from(MovementDetail.pdf()));
});

When(
  '{pronoun} descarga el comprobante del primer movimiento del historial',
  async (actor: Actor) => {
    await actor.attemptsTo(
      WaitUntilVisible(MovementHistory.firstPdf()),
      DownloadTheReceipt.from(MovementHistory.firstPdf()),
    );
  },
);

Then('el archivo descargado se llama como el código del movimiento', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(ReceiptQuestions.filename(), equals(ReceiptQuestions.expectedFilename())),
  );
});

Then('el archivo descargado es un PDF', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(ReceiptQuestions.header(), equals('%PDF-')),
    Ensure.that(ReceiptQuestions.size(), isGreaterThan(0)),
  );
});

When(
  '{pronoun} pide directamente a la API el comprobante de ese movimiento',
  async (actor: Actor) => {
    await actor.attemptsTo(UseTheApi.signIn(), RequestTheReceipt());
  },
);

Then('la API responde con el tipo de contenido {string}', async (contentType: string) => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(ReceiptQuestions.contentType(), includes(contentType)),
  );
});

Then('la API lo entrega como adjunto', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(ReceiptQuestions.disposition(), startsWith('attachment')),
  );
});
