import { includes } from '@serenity-js/assertions';
import { Interaction, TakeNotes, Task, type UsesAbilities, notes } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';
import { Click, Enter, Text } from '@serenity-js/web';
import { environment } from '../support/environment';
import { MovementDetail } from '../ui/MovementDetail';
import type { MovementNotes } from './RegisterMovement';
import { RespectTheLoginRateLimit } from './RespectTheLoginRateLimit';
import { WaitUntilVisible, waitPatiently } from './Waits';

export const OpenTheCancellation = () =>
  Task.where(
    '#actor abre la anulación del movimiento',
    WaitUntilVisible(MovementDetail.cancel()),
    Click.on(MovementDetail.cancel()),
    WaitUntilVisible(MovementDetail.cancelReason()),
  );

export const SubmitTheCancellation = () =>
  Task.where('#actor confirma la anulación', Click.on(MovementDetail.confirmCancel()));

export const CancelMovement = {
  withReason: (reason: string) =>
    Task.where(
      `#actor anula el movimiento con el motivo "${reason}"`,
      OpenTheCancellation(),
      Enter.theValue(reason).into(MovementDetail.cancelReason()),
      SubmitTheCancellation(),
      waitPatiently().until(Text.of(MovementDetail.badges()), includes('anulado')),
      notes<MovementNotes>().set('movementCancelled', true),
    ),
};

/** Whether the scenario confirmed a movement it did not get to void. */
export const leftAMovementBehind = (actor: UsesAbilities) => {
  const notepad = (TakeNotes.as(actor) as TakeNotes<MovementNotes>).notepad;
  return notepad.has('movementId') && !notepad.get('movementCancelled');
};

/**
 * The safety net for a scenario that failed between confirming and voiding: the
 * movement it left behind is voided through the API, so the stock goes back to
 * what it was. Goes through the ability for the same reason UseTheApi does, and
 * a 409 means it was already voided.
 */
const VoidThroughTheApi = () =>
  Interaction.where('#actor anula por la API lo que quedó confirmado', async (actor) => {
    const notepad = (TakeNotes.as(actor) as TakeNotes<MovementNotes>).notepad;
    const api = CallAnApi.as(actor);
    const login = await api.request({
      method: 'POST',
      url: '/api/v1/auth/login',
      data: environment.credentials(),
    });
    const { accessToken } = login.data as { accessToken: string };

    await api.request({
      method: 'POST',
      url: `/api/v1/movements/${notepad.get('movementId')}/cancel`,
      data: { reason: 'Limpieza de una prueba E2E que falló' },
      headers: { Authorization: `Bearer ${accessToken}` },
      validateStatus: (status) => status < 300 || status === 409,
    });
    notepad.set('movementCancelled', true);
  });

export const VoidWhatWasLeftBehind = () =>
  Task.where(
    '#actor anula lo que la prueba dejó confirmado',
    RespectTheLoginRateLimit(),
    VoidThroughTheApi(),
  );
