import { matches } from '@serenity-js/assertions';
import { type Activity, Task, notes } from '@serenity-js/core';
import { Click, Enter, Page, Text } from '@serenity-js/web';
import { MovementDetail } from '../ui/MovementDetail';
import { MovementRegister } from '../ui/MovementRegister';
import { GoTo } from './GoTo';
import { WaitUntilPresent, WaitUntilVisible, waitPatiently } from './Waits';

export interface MovementNotes {
  chosenProduct: string;
  movementId: string;
  movementCode: string;
  movementCancelled: boolean;
}

/** What each type is called on the panel's "Registrar un movimiento" card. */
export const ENTRY_POINTS = {
  salida: 'Registrar una salida',
  entrada: 'Registrar una entrada',
  traspaso: 'Registrar un traspaso',
  ajuste: 'Registrar un ajuste',
} as const;

export type MovementKind = keyof typeof ENTRY_POINTS;

const chosenProduct = () => notes<MovementNotes>().get('chosenProduct');

const MOVEMENT_PATH = /^\/movements\/[0-9a-f-]{36}$/;

export const OpenTheCapture = {
  of: (kind: MovementKind) =>
    Task.where(
      `#actor abre la captura de ${kind}`,
      GoTo.section('Panel'),
      WaitUntilVisible(MovementRegister.entryPoint(ENTRY_POINTS[kind])),
      Click.on(MovementRegister.entryPoint(ENTRY_POINTS[kind])),
      WaitUntilVisible(MovementRegister.location(kind === 'traspaso' ? 'Desde' : 'Bodega')),
    ),
};

export const ChooseLocation = {
  /**
   * Named explicitly rather than left empty: an empty origin asks the picker for
   * the total across every location, while the API takes stock from the default
   * one, and the two only agree while nothing has been transferred.
   */
  defaultAs: (label: string) =>
    Task.where(
      `#actor elige la bodega por defecto en "${label}"`,
      Click.on(MovementRegister.location(label)),
      WaitUntilVisible(MovementRegister.defaultLocationOption()),
      Click.on(MovementRegister.defaultLocationOption()),
    ),

  /** The first option after the placeholder; the origin is already left out. */
  anyOtherAs: (label: string) =>
    Task.where(
      `#actor elige otra bodega en "${label}"`,
      Click.on(MovementRegister.location(label)),
      WaitUntilVisible(MovementRegister.locationOptions().nth(1)),
      Click.on(MovementRegister.locationOptions().nth(1)),
    ),
};

export const AddBottles = {
  /**
   * For a movement that takes stock out, waits for the on-hand figures first:
   * until they arrive every stepper is enabled, and a bottle added then could
   * belong to a product with nothing on the shelf.
   */
  ofTheFirstAvailableProduct: (count: number, { capped }: { capped: boolean }) =>
    Task.where(
      `#actor añade ${count} botella(s) del primer producto disponible`,
      ...(capped ? [WaitUntilPresent(MovementRegister.onHandFigures().first())] : []),
      WaitUntilPresent(MovementRegister.firstAvailableCardName()),
      notes<MovementNotes>().set(
        'chosenProduct',
        Text.of(MovementRegister.firstAvailableCardName()),
      ),
      ...Array.from({ length: count }, () =>
        Click.on(MovementRegister.addBottleOn(chosenProduct())),
      ),
      WaitUntilVisible(MovementRegister.confirm()),
    ),
};

export const ConfirmTheMovement = () =>
  Task.where(
    '#actor confirma el movimiento',
    Click.on(MovementRegister.confirm()),
    WaitUntilVisible(MovementRegister.confirmInDialog()),
    Click.on(MovementRegister.confirmInDialog()),
    // The app lands on the movement's own page once the API has confirmed it.
    waitPatiently().until(Page.current().url().pathname, matches(MOVEMENT_PATH)),
    WaitUntilVisible(MovementDetail.badges()),
    notes<MovementNotes>().set(
      'movementId',
      Page.current()
        .url()
        .pathname.as((path) => path.split('/').pop() ?? ''),
    ),
    notes<MovementNotes>().set('movementCode', Text.of(MovementDetail.code())),
    notes<MovementNotes>().set('movementCancelled', false),
  );

export const RegisterMovement = {
  /** Captures and confirms a movement of `count` bottles, which writes to the ledger. */
  of: (kind: MovementKind, count: number, { reason }: { reason?: string } = {}) => {
    const steps: Activity[] = [OpenTheCapture.of(kind)];

    if (kind === 'salida') steps.push(ChooseLocation.defaultAs('Bodega'));
    if (kind === 'traspaso') {
      steps.push(ChooseLocation.defaultAs('Desde'), ChooseLocation.anyOtherAs('Hacia'));
    }
    if (reason) steps.push(Enter.theValue(reason).into(MovementRegister.reason()));

    steps.push(
      AddBottles.ofTheFirstAvailableProduct(count, {
        capped: kind === 'salida' || kind === 'traspaso',
      }),
      ConfirmTheMovement(),
    );

    return Task.where(`#actor registra ${kind} de ${count} botella(s)`, ...steps);
  },
};
