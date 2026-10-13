import { readFile } from 'node:fs/promises';
import { type Answerable, Interaction, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright, type PlaywrightPage } from '@serenity-js/playwright';
import type { PageElement } from '@serenity-js/web';

export interface ReceiptNotes {
  receiptFilename: string;
  /** The first bytes of the file, which is where a PDF says it is one. */
  receiptHeader: string;
  receiptSize: number;
}

/**
 * The button builds a blob URL and clicks a hidden link to it, so there is no
 * response to inspect: what proves the download is the file the browser saves.
 * The download has to be awaited from before the click, or it can be missed.
 */
export const DownloadTheReceipt = {
  from: (button: Answerable<PageElement>) =>
    Interaction.where('#actor descarga el comprobante en PDF', async (actor) => {
      const page = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
      const native = await page.nativePage();

      const download = native.waitForEvent('download', { timeout: 60_000 });
      await (await actor.answer(button)).click();
      const file = await download;

      const path = await file.path();
      const content = await readFile(path);

      const notepad = (TakeNotes.as(actor) as TakeNotes<ReceiptNotes>).notepad;
      notepad.set('receiptFilename', file.suggestedFilename());
      notepad.set('receiptHeader', content.subarray(0, 5).toString('latin1'));
      notepad.set('receiptSize', content.length);
    }),
};
