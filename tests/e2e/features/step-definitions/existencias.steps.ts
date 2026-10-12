import { type DataTable, Then, When } from '@cucumber/cucumber';
import {
  Ensure,
  containItemsWhereEachItem,
  equals,
  includes,
  isGreaterThan,
  matches,
} from '@serenity-js/assertions';
import { type Actor, actorInTheSpotlight } from '@serenity-js/core';
import {
  ApiQuestions,
  DashboardQuestions,
  KardexQuestions,
  StockQuestions,
} from '../../screenplay/questions/AppQuestions';
import { OpenKardex } from '../../screenplay/tasks/OpenKardex';
import { SearchStock } from '../../screenplay/tasks/SearchStock';
import { UseTheApi } from '../../screenplay/tasks/UseTheApi';
import { WaitUntilPresent, WaitUntilVisible, waitPatiently } from '../../screenplay/tasks/Waits';
import { Dashboard } from '../../screenplay/ui/Dashboard';
import { StockPage } from '../../screenplay/ui/StockPage';

// RF-22

Then('la tabla de existencias tiene las columnas:', async (table: DataTable) => {
  await actorInTheSpotlight().attemptsTo(
    WaitUntilVisible(StockPage.table()),
    Ensure.that(
      StockQuestions.columns(),
      equals(
        table
          .raw()
          .flat()
          .map((column) => column.toLocaleLowerCase('es')),
      ),
    ),
  );
});

Then('la tabla lista al menos un producto', async () => {
  await actorInTheSpotlight().attemptsTo(
    WaitUntilPresent(StockPage.productLinks().first()),
    Ensure.that(StockPage.productLinks().count(), isGreaterThan(0)),
  );
});

Then('el conteo de resultados tiene la forma {string}', async (shape: string) => {
  const pattern = new RegExp(`^${shape.replace('N', '\\d+')}$`);
  await actorInTheSpotlight().attemptsTo(
    WaitUntilPresent(StockPage.resultCount()),
    Ensure.that(StockQuestions.resultCount(), matches(pattern)),
  );
});

// RF-23

When('{pronoun} busca {string} en las existencias', async (actor: Actor, term: string) => {
  await actor.attemptsTo(SearchStock.for(term));
});

Then('todos los productos listados contienen {string}', async (term: string) => {
  // The search is debounced and server-side: wait for the rows to change, then check them.
  await actorInTheSpotlight().attemptsTo(
    waitPatiently().until(
      StockQuestions.listedProducts(),
      containItemsWhereEachItem(includes(term)),
    ),
    Ensure.that(StockQuestions.listedProducts(), containItemsWhereEachItem(includes(term))),
  );
});

Then('{pronoun} ve el aviso de que ningún producto coincide', async (actor: Actor) => {
  await actor.attemptsTo(WaitUntilVisible(StockQuestions.emptyState()));
});

// RF-24

When('{pronoun} abre el kardex del primer producto de la lista', async (actor: Actor) => {
  await actor.attemptsTo(OpenKardex.ofTheFirstListedProduct());
});

Then('el kardex es del producto que eligió', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(KardexQuestions.productName(), equals(KardexQuestions.chosenProduct())),
  );
});

Then('el saldo de la línea más reciente coincide con las unidades en existencia', async () => {
  await actorInTheSpotlight().attemptsTo(
    Ensure.that(KardexQuestions.latestBalance(), equals(KardexQuestions.onHand())),
  );
});

// RF-27

When(
  '{pronoun} consulta directamente en la API los {int} productos más bajo mínimo',
  async (actor: Actor, limit: number) => {
    await actor.attemptsTo(UseTheApi.signIn(), UseTheApi.requestLowStock(limit));
  },
);

Then('la API responde con estado {int}', async (status: number) => {
  await actorInTheSpotlight().attemptsTo(Ensure.that(ApiQuestions.status(), equals(status)));
});

Then(
  'la tarjeta {string} muestra los mismos productos que la API, en el mismo orden',
  async (_card: string) => {
    await actorInTheSpotlight().attemptsTo(
      WaitUntilVisible(Dashboard.lowStockTitle()),
      waitPatiently().until(
        DashboardQuestions.lowStockProducts(),
        equals(ApiQuestions.lowStockProducts()),
      ),
    );
  },
);
