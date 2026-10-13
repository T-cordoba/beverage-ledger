import {
  type AnswersQuestions,
  Interaction,
  TakeNotes,
  Task,
  type UsesAbilities,
} from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';
import type { MovementNotes } from './RegisterMovement';
import { UseTheApi } from './UseTheApi';

export interface StockNotes {
  accessToken: string;
  stockProductId: string;
  stockLocationId: string;
  stockBefore: number;
}

type ApiActor = UsesAbilities & AnswersQuestions;

const notepadOf = (actor: UsesAbilities) =>
  (TakeNotes.as(actor) as TakeNotes<StockNotes & MovementNotes>).notepad;

const authorised = (actor: UsesAbilities) => ({
  Authorization: `Bearer ${notepadOf(actor).get('accessToken')}`,
});

/** What the API says is on hand of one product at one location, in base units. */
export const stockOnHand = async (actor: ApiActor) => {
  const notepad = notepadOf(actor);
  const response = await CallAnApi.as(actor).request({
    method: 'GET',
    url: '/api/v1/stock',
    params: {
      productIds: notepad.get('stockProductId'),
      locationId: notepad.get('stockLocationId'),
    },
    headers: authorised(actor),
  });
  const [level] = (response.data as { data: { quantityBase: number }[] }).data;
  return level?.quantityBase ?? 0;
};

/** Reads the movement back from the API to learn which product and location it touched. */
const NoteWhatTheMovementTouched = () =>
  Interaction.where('#actor anota el producto y la bodega del movimiento', async (actor) => {
    const notepad = notepadOf(actor);
    const response = await CallAnApi.as(actor).request({
      method: 'GET',
      url: `/api/v1/movements/${notepad.get('movementId')}`,
      headers: authorised(actor),
    });
    const [line] = (response.data as { items: { productId: string; locationId: string }[] }).items;
    notepad.set('stockProductId', line.productId);
    notepad.set('stockLocationId', line.locationId);
    notepad.set('stockBefore', await stockOnHand(actor));
  });

export const NoteTheStock = {
  ofTheMovementProduct: () =>
    Task.where(
      '#actor anota en la API las existencias del producto del movimiento',
      UseTheApi.signIn(),
      NoteWhatTheMovementTouched(),
    ),
};
