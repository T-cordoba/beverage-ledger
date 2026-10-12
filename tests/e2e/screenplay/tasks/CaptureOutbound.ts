import { Task } from '@serenity-js/core';
import { Click, Navigate } from '@serenity-js/web';
import { Dashboard } from '../ui/Dashboard';
import { MovementCapture } from '../ui/MovementCapture';
import { GoTo } from './GoTo';
import { WaitUntilPresent, WaitUntilVisible } from './Waits';

export const CaptureOutbound = {
  /** Fills the draft without confirming it: nothing reaches the ledger. */
  withBottles: (count: number) =>
    Task.where(
      `#actor captura una salida de ${count} botellas sin confirmarla`,
      GoTo.section('Panel'),
      WaitUntilVisible(Dashboard.registerOutbound()),
      Click.on(Dashboard.registerOutbound()),
      // Present, not visible: the picker sits below the fold and Click scrolls to it.
      WaitUntilPresent(MovementCapture.firstAvailableAddBottle()),
      ...Array.from({ length: count }, () => Click.on(MovementCapture.firstAvailableAddBottle())),
      WaitUntilVisible(MovementCapture.draftSummary()),
    ),
};

export const ReloadThePage = () => Task.where('#actor recarga la página', Navigate.reloadPage());

export const DiscardTheDraft = () =>
  Task.where(
    '#actor descarta el borrador',
    Click.on(MovementCapture.discard()),
    WaitUntilVisible(MovementCapture.confirmDiscard()),
    Click.on(MovementCapture.confirmDiscard()),
  );
