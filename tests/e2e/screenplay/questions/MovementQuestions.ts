import { Question, notes } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';
import { Text } from '@serenity-js/web';
import type { ReceiptNotes } from '../tasks/DownloadReceipt';
import { type StockNotes, stockOnHand } from '../tasks/NoteTheStock';
import type { MovementNotes } from '../tasks/RegisterMovement';
import { MovementDetail } from '../ui/MovementDetail';
import { MovementRegister } from '../ui/MovementRegister';

/** "1.234 en existencia · quedan 1.233", read back as the two numbers it carries. */
const figuresOf = (text: string) =>
  text.split('·').map((part) => Number(part.replace(/\./g, '').replace(/[^\d-]/g, '')));

export const CaptureQuestions = {
  chosenProduct: () => notes<MovementNotes>().get('chosenProduct'),
  onHand: () =>
    Text.of(MovementRegister.onHandOn(notes<MovementNotes>().get('chosenProduct')))
      .as((text) => figuresOf(text)[0])
      .describedAs('lo que el producto tiene en existencia'),
  left: () =>
    Text.of(MovementRegister.onHandOn(notes<MovementNotes>().get('chosenProduct')))
      .as((text) => figuresOf(text)[1])
      .describedAs('lo que le queda tras lo capturado'),
  blockers: () => Text.of(MovementRegister.blockers()),
};

export const MovementQuestions = {
  code: () => Text.of(MovementDetail.code()),
  notedCode: () => notes<MovementNotes>().get('movementCode'),
  badges: () =>
    Text.of(MovementDetail.badges())
      .toLocaleLowerCase('es')
      .describedAs('el tipo y el estado del movimiento'),
  linesHeading: () => Text.of(MovementDetail.linesHeading()),
  lineQuantities: () => Text.ofAll(MovementDetail.lineQuantities()),
  detail: (label: string) => Text.of(MovementDetail.detail(label)),
  cancelReasonError: () => Text.of(MovementDetail.cancelReasonError()),
};

export const LedgerQuestions = {
  /** Compared against what NoteTheStock wrote down, so it reads the effect of what came after. */
  stockChange: () =>
    Question.about(
      'cuánto cambiaron las existencias del producto según la API',
      async (actor) =>
        (await stockOnHand(actor)) - (await actor.answer(notes<StockNotes>().get('stockBefore'))),
    ),
};

export const ReceiptQuestions = {
  filename: () => notes<ReceiptNotes>().get('receiptFilename'),
  expectedFilename: () =>
    Question.about(
      'el código del movimiento seguido de .pdf',
      async (actor) => `${await actor.answer(notes<MovementNotes>().get('movementCode'))}.pdf`,
    ),
  header: () => notes<ReceiptNotes>().get('receiptHeader'),
  size: () => notes<ReceiptNotes>().get('receiptSize'),
  contentType: () => LastResponse.header('content-type'),
  disposition: () => LastResponse.header('content-disposition'),
};
