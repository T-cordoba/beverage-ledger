import { Duration, Wait } from '@serenity-js/core';
import { isPresent } from '@serenity-js/assertions';
import { isVisible, type PageElement } from '@serenity-js/web';
import type { Answerable } from '@serenity-js/core';

// Wait's own default is five seconds, which a cold Render instance outlasts.
const PATIENCE = Duration.ofSeconds(60);

export const WaitUntilVisible = (element: Answerable<PageElement>) =>
  Wait.upTo(PATIENCE).until(element, isVisible());

/** For what sits below the fold: Serenity's isVisible also requires being in the viewport. */
export const WaitUntilPresent = (element: Answerable<PageElement>) =>
  Wait.upTo(PATIENCE).until(element, isPresent());

export const waitPatiently = () => Wait.upTo(PATIENCE);
