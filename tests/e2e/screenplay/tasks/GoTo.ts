import { equals } from '@serenity-js/assertions';
import { Task } from '@serenity-js/core';
import { Click, Page } from '@serenity-js/web';
import { Navigation, SECTION_PATHS, type Section } from '../ui/Navigation';
import { WaitUntilVisible, waitPatiently } from './Waits';

/**
 * Moves through the menu rather than typing a URL: a full navigation drops the
 * access token held in memory and has to buy a new one with the refresh cookie.
 */
export const GoTo = {
  section: (section: Section) =>
    Task.where(
      `#actor abre la sección ${section}`,
      WaitUntilVisible(Navigation.linkTo(section)),
      Click.on(Navigation.linkTo(section)),
      // The previous page's title is still on screen until the route changes.
      waitPatiently().until(Page.current().url().pathname, equals(SECTION_PATHS[section])),
      WaitUntilVisible(Navigation.pageTitle()),
    ),
};
