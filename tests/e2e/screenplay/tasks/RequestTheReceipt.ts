import { Question, Task, notes } from '@serenity-js/core';
import { GetRequest, Send } from '@serenity-js/rest';
import type { MovementNotes } from './RegisterMovement';

const bearer = Question.about(
  'el token de la sesión',
  async (actor) =>
    `Bearer ${await actor.answer(notes<{ accessToken: string }>().get('accessToken'))}`,
);

const receiptPath = Question.about(
  'la ruta del comprobante',
  async (actor) =>
    `/api/v1/movements/${await actor.answer(notes<MovementNotes>().get('movementId'))}/pdf`,
);

export const RequestTheReceipt = () =>
  Task.where(
    '#actor pide a la API el comprobante del movimiento',
    Send.a(
      GetRequest.to(receiptPath).using({
        headers: { Authorization: bearer },
        // Read as bytes: decoding a PDF as text would mangle the very header checked.
        responseType: 'arraybuffer',
      }),
    ),
  );
