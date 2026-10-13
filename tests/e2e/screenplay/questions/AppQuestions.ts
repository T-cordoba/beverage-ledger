import { Question, notes } from '@serenity-js/core';
import { LastResponse } from '@serenity-js/rest';
import { Page, Text } from '@serenity-js/web';
import type { KardexNotes } from '../tasks/OpenKardex';
import { Dashboard } from '../ui/Dashboard';
import { KardexPage } from '../ui/KardexPage';
import { LoginForm } from '../ui/LoginForm';
import { MovementCapture } from '../ui/MovementCapture';
import { Navigation } from '../ui/Navigation';
import { ReportsPage } from '../ui/ReportsPage';
import { StockPage } from '../ui/StockPage';

/** "1.234" or "-12" as the UI formats it in Spanish, read back as a number. */
const asNumber = (text: string) => Number(text.replace(/\./g, '').replace(/[^\d-]/g, ''));

export const CurrentPage = {
  path: () => Page.current().url().pathname.describedAs('la ruta actual'),
  title: () => Text.of(Navigation.pageTitle()),
};

export const LoginQuestions = {
  alert: () => Text.of(LoginForm.alert()),
};

export const StockQuestions = {
  // The headers are uppercased by CSS, and the text a browser reports follows the CSS.
  columns: () =>
    Question.about('las columnas de la tabla', async (actor) =>
      (await actor.answer(Text.ofAll(StockPage.columnHeaders()))).map((column) =>
        column.toLocaleLowerCase('es'),
      ),
    ),
  listedProducts: () => Text.ofAll(StockPage.productLinks()),
  resultCount: () => Text.of(StockPage.resultCount()),
  emptyState: () => StockPage.emptyState(),
};

export const KardexQuestions = {
  productName: () => Text.of(KardexPage.productName()),
  chosenProduct: () => notes<KardexNotes>().get('chosenProduct'),
  onHand: () => Text.of(KardexPage.onHand()).as(asNumber).describedAs('las unidades en existencia'),
  latestBalance: () =>
    Text.of(KardexPage.latestBalance()).as(asNumber).describedAs('el saldo más reciente'),
};

export const DashboardQuestions = {
  lowStockProducts: () => Text.ofAll(Dashboard.lowStockProducts()),
};

export const ApiQuestions = {
  status: () => LastResponse.status(),
  lowStockProducts: () =>
    Question.about('los productos bajo mínimo según la API', async (actor) => {
      const rows = await actor.answer(LastResponse.body<{ productName: string }[]>());
      return rows.map((row) => row.productName);
    }),
};

export const ReportQuestions = {
  rankingSize: () => ReportsPage.rankingRows().count(),
  positions: () =>
    Question.about('las posiciones del ranking', async (actor) =>
      (await actor.answer(Text.ofAll(ReportsPage.rankingPositions()))).map(asNumber),
    ),
  quantities: () =>
    Question.about('las unidades del ranking', async (actor) =>
      (await actor.answer(Text.ofAll(ReportsPage.rankingQuantities()))).map(asNumber),
    ),
};

export const DraftQuestions = {
  summary: () => Text.of(MovementCapture.draftSummary()),
  summaryBar: () => MovementCapture.draftSummary(),
};
