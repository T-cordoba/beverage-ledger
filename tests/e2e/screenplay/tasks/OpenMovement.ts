import { Task, notes } from '@serenity-js/core';
import { Attribute, Click, Text } from '@serenity-js/web';
import { MovementDetail, MovementHistory } from '../ui/MovementDetail';
import { GoTo } from './GoTo';
import type { MovementNotes } from './RegisterMovement';
import { WaitUntilVisible } from './Waits';

/** The history is newest first, so this reads whatever was recorded last, without writing. */
export const RememberTheLatestMovement = () =>
  Task.where(
    '#actor anota el movimiento más reciente del historial',
    GoTo.section('Movimientos'),
    WaitUntilVisible(MovementHistory.codes().first()),
    notes<MovementNotes>().set('movementCode', Text.of(MovementHistory.codes().first())),
    notes<MovementNotes>().set(
      'movementId',
      Attribute.called('href')
        .of(MovementHistory.codes().first())
        .as((href) => href.split('/').pop() ?? ''),
    ),
  );

export const OpenTheLatestMovement = () =>
  Task.where(
    '#actor abre el movimiento más reciente',
    RememberTheLatestMovement(),
    Click.on(MovementHistory.codes().first()),
    WaitUntilVisible(MovementDetail.pdf()),
  );
