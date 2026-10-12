import { isPresent, not } from '@serenity-js/assertions';
import { Task } from '@serenity-js/core';
import { Click } from '@serenity-js/web';
import { ReportsPage } from '../ui/ReportsPage';
import { WaitUntilVisible, waitPatiently } from './Waits';

export const ChangeReport = {
  to: (option: string) =>
    Task.where(
      `#actor elige "${option}" en el reporte`,
      // Clicking while the report is still loading hits a control that re-renders away.
      waitPatiently().until(ReportsPage.loading(), not(isPresent())),
      WaitUntilVisible(ReportsPage.option(option)),
      Click.on(ReportsPage.option(option)),
      WaitUntilVisible(ReportsPage.selectedOption(option)),
      waitPatiently().until(ReportsPage.loading(), not(isPresent())),
    ),
};
