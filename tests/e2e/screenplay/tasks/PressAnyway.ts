import { type Answerable, Interaction } from '@serenity-js/core';
import type { PlaywrightPageElement } from '@serenity-js/playwright';
import type { PageElement } from '@serenity-js/web';

/**
 * Presses a button the app marks `aria-disabled` instead of `disabled`, so that
 * pressing it can still say what is missing. Playwright reads `aria-disabled` as
 * not enabled and would wait for it forever; a person can press it all the same.
 */
export const PressAnyway = {
  the: (button: Answerable<PageElement>) =>
    Interaction.where('#actor pulsa el botón aunque se anuncie no disponible', async (actor) => {
      const element = (await actor.answer(button)) as PlaywrightPageElement;
      const locator = await element.nativeElement();
      await locator.click({ force: true });
    }),
};
