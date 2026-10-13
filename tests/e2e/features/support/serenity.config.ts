import { AfterAll, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { Cast, TakeNotes, configure } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { CallAnApi } from '@serenity-js/rest';
import { type Browser, chromium } from 'playwright';
import { environment } from '../../screenplay/support/environment';

let browser: Browser;

// The API on Render's free tier sleeps when idle and takes up to a minute to
// answer the first request after that.
setDefaultTimeout(120_000);

BeforeAll(async () => {
  browser = await chromium.launch({ headless: environment.headless });

  configure({
    actors: Cast.where((actor) =>
      actor.whoCan(
        BrowseTheWebWithPlaywright.using(
          browser,
          { baseURL: environment.baseUrl },
          { defaultNavigationTimeout: 90_000, defaultTimeout: 60_000 },
        ),
        CallAnApi.at(environment.apiUrl),
        TakeNotes.usingAnEmptyNotepad(),
      ),
    ),
    crew: [
      '@serenity-js/console-reporter',
      ['@serenity-js/html-reporter', { specDirectory: './tests/e2e/features' }],
    ],
  });
});

AfterAll(async () => {
  await browser?.close();
});
