import { Interaction, Question, TakeNotes, Task, notes } from '@serenity-js/core';
import { CallAnApi, GetRequest, Send } from '@serenity-js/rest';
import { environment } from '../support/environment';
import { RespectTheLoginRateLimit } from './RespectTheLoginRateLimit';

interface ApiNotes {
  accessToken: string;
}

const bearer = Question.about(
  'el token de la sesión',
  async (actor) => `Bearer ${await actor.answer(notes<ApiNotes>().get('accessToken'))}`,
);

/**
 * Goes through the ability directly instead of `Send`: `Send` attaches the request
 * body to the report, and this body is the account's password.
 */
const AuthenticateAgainstTheApi = () =>
  Interaction.where('#actor se autentica contra la API', async (actor) => {
    const response = await CallAnApi.as(actor).request({
      method: 'POST',
      url: '/api/v1/auth/login',
      data: environment.credentials(),
    });
    const notepad = (TakeNotes.as(actor) as TakeNotes<ApiNotes>).notepad;
    notepad.set('accessToken', (response.data as ApiNotes).accessToken);
  });

export const UseTheApi = {
  signIn: () =>
    Task.where(
      '#actor abre una sesión directamente contra la API',
      RespectTheLoginRateLimit(),
      AuthenticateAgainstTheApi(),
    ),

  requestLowStock: (limit: number) =>
    Task.where(
      `#actor pide a la API los ${limit} productos más bajo mínimo`,
      Send.a(
        GetRequest.to(`/api/v1/stock/low?limit=${limit}`).using({
          headers: { Authorization: bearer },
        }),
      ),
    ),
};
