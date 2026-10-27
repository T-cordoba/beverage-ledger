import type { Page } from '@browserbasehq/stagehand';

/**
 * Deterministic reads of the page, the half of every scenario that does not go
 * through the model. Kept as plain JavaScript text on purpose: tsx compiles the
 * suite with esbuild's keepNames, which wraps functions in a `__name()` helper
 * that does not exist inside the browser, so a serialized TypeScript function
 * would throw there.
 */
const LIBRARY = String.raw`
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const disabled = (el) => el.disabled === true || el.getAttribute('aria-disabled') === 'true';
const labelOf = (el) => {
  if (el.getAttribute('aria-label')) return norm(el.getAttribute('aria-label'));
  const ids = el.getAttribute('aria-labelledby');
  if (ids) return norm(ids.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
  if (el.labels && el.labels.length) return norm([...el.labels].map((l) => l.textContent).join(' '));
  return norm(el.textContent);
};
const buttonsIn = (root) => [...root.querySelectorAll('button, a[role=button], [role=button]')].filter(visible);
const describeButton = (b) => ({ name: labelOf(b), disabled: disabled(b) });
const numberIn = (text, re) => { const m = re.exec(text); return m ? Number(m[1]) : null; };
const cardOf = (li) => {
  const text = norm(li.innerText);
  const button = (name) => {
    const b = buttonsIn(li).find((x) => labelOf(x) === name);
    return b ? { exists: true, disabled: disabled(b) } : { exists: false, disabled: true };
  };
  return {
    name: norm(li.querySelector('h3')?.textContent),
    stock: numberIn(text, /(\d+) en existencia/),
    left: numberIn(text, /quedan (-?\d+)/),
    total: numberIn(text, /(-?\d+) unidad(?:es)? en total/),
    limit: norm(li.querySelector('[aria-live]')?.textContent),
    text,
    addBottle: button('Añadir botella'),
    removeBottle: button('Quitar botella'),
    addCase: button('Añadir caja'),
    removeCase: button('Quitar caja'),
  };
};
const cardItems = () => [...document.querySelectorAll('li')].filter((li) => li.querySelector('h3') && buttonsIn(li).some((b) => labelOf(b) === 'Añadir botella'));
const field = (label) => {
  const controls = [...document.querySelectorAll('input, textarea')].filter(visible);
  return controls.find((c) => labelOf(c).startsWith(label));
};
const api = {
  text: () => norm(document.body.innerText),
  h1: () => norm(document.querySelector('h1')?.textContent),
  cards: () => cardItems().map(cardOf),
  tagCard: (name, tag) => {
    document.querySelectorAll('[data-sh-card="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-card'));
    const li = cardItems().find((x) => norm(x.querySelector('h3')?.textContent) === name);
    if (li) li.setAttribute('data-sh-card', tag);
    return !!li;
  },
  buttons: (name) => [...document.querySelectorAll('button, a')].filter(visible).filter((b) => labelOf(b) === name).map(describeButton),
  dialog: () => {
    const d = [...document.querySelectorAll('[role=dialog], [role=alertdialog]')].find(visible);
    if (!d) return null;
    if (!d.hasAttribute('data-sh-dialog')) d.setAttribute('data-sh-dialog', '');
    return { heading: norm(d.querySelector('h2, h1')?.textContent), text: norm(d.innerText), buttons: buttonsIn(d).map(describeButton) };
  },
  field: (label) => {
    const c = field(label);
    return c ? { label: labelOf(c), value: c.value, invalid: c.getAttribute('aria-invalid') === 'true', placeholder: c.getAttribute('placeholder') } : null;
  },
  combobox: (label) => {
    const c = [...document.querySelectorAll('[role=combobox]')].filter(visible).find((x) => labelOf(x).startsWith(label));
    return c ? { text: norm(c.textContent), disabled: disabled(c), expanded: c.getAttribute('aria-expanded') === 'true' } : null;
  },
  options: () => {
    const list = [...document.querySelectorAll('[role=listbox]')].find(visible);
    return list ? [...list.querySelectorAll('[role=option]')].map((o) => norm(o.textContent)) : null;
  },
  articles: () => [...document.querySelectorAll('article')].filter(visible).map((a) => ({
    code: norm([...a.querySelectorAll('a')].map((l) => l.textContent).find((t) => /^\s*MOV-\d{4}-\d+\s*$/.test(t ?? ''))),
    text: norm(a.innerText),
    pdf: (() => { const b = buttonsIn(a).find((x) => norm(x.textContent) === 'PDF'); return b ? { description: norm(b.getAttribute('aria-describedby') ? document.getElementById(b.getAttribute('aria-describedby'))?.textContent : b.getAttribute('title')) } : null; })(),
  })),
  tagArticle: (code, tag) => {
    document.querySelectorAll('[data-sh-article="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-article'));
    const a = [...document.querySelectorAll('article')].filter(visible).find((x) => [...x.querySelectorAll('a')].some((l) => norm(l.textContent) === code));
    if (a) a.setAttribute('data-sh-article', tag);
    return !!a;
  },
  stockRows: () => [...document.querySelectorAll('tr')].filter((tr) => tr.querySelector('a')).map((tr) => ({
    name: norm(tr.querySelector('a')?.textContent),
    units: numberIn(norm(tr.innerText), /(-?\d+) unidad/),
    text: norm(tr.innerText),
  })),
  detail: (label) => {
    const dt = [...document.querySelectorAll('dt')].find((x) => norm(x.textContent) === label);
    return dt ? norm(dt.nextElementSibling?.textContent) : null;
  },
  accountName: () => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') ?? '').startsWith('Menú de la cuenta de '));
    return b ? b.getAttribute('aria-label').replace('Menú de la cuenta de ', '') : null;
  },
  tagField: (label, tag) => {
    document.querySelectorAll('[data-sh-field="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-field'));
    const c = field(label);
    if (c) c.setAttribute('data-sh-field', tag);
    return !!c;
  },
  tagCombobox: (label, tag) => {
    document.querySelectorAll('[data-sh-combobox="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-combobox'));
    const c = [...document.querySelectorAll('[role=combobox]')].filter(visible).find((x) => labelOf(x).startsWith(label));
    if (c) c.setAttribute('data-sh-combobox', tag);
    return !!c;
  },
  tagOption: (text, tag) => {
    document.querySelectorAll('[data-sh-option="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-option'));
    const list = [...document.querySelectorAll('[role=listbox]')].find(visible);
    const o = list && [...list.querySelectorAll('[role=option]')].find((x) => norm(x.textContent) === text);
    if (o) o.setAttribute('data-sh-option', tag);
    return !!o;
  },
  nameAt: (xpath) => {
    const node = document.evaluate(xpath.replace(/^xpath=/, ''), document, null, 9, null).singleNodeValue;
    const el = node && (node.closest ? node : node.parentElement);
    const target = el && (el.closest('button, a, [role=button], [role=option], [role=combobox], input, textarea') ?? el);
    return target ? labelOf(target) : null;
  },
  fieldAt: (xpath) => {
    const node = document.evaluate(xpath.replace(/^xpath=/, ''), document, null, 9, null).singleNodeValue;
    return node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') ? labelOf(node) : null;
  },
  tagFieldGroup: (label, tag) => {
    document.querySelectorAll('[data-sh-group="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-group'));
    let group = field(label);
    while (group && !group.querySelector('label')) group = group.parentElement;
    if (group) group.setAttribute('data-sh-group', tag);
    return !!group;
  },
  valueLength: (label) => { const c = field(label); return c ? c.value.length : -1; },
  tagBar: () => {
    document.querySelectorAll('[data-sh-bar]').forEach((el) => el.removeAttribute('data-sh-bar'));
    const confirm = buttonsIn(document).find((b) => labelOf(b) === 'Confirmar' && !b.closest('[role=dialog], [role=alertdialog]'));
    let bar = confirm;
    while (bar && !buttonsIn(bar).some((b) => labelOf(b) === 'Descartar')) bar = bar.parentElement;
    if (bar) bar.setAttribute('data-sh-bar', '');
    return !!bar;
  },
  hydrated: (label) => { const c = field(label); return !!c && Object.keys(c).some((k) => k.startsWith('__reactProps')); },
  headers: () => [...document.querySelectorAll('th')].filter(visible).map((th) => norm(th.textContent)),
  cells: () => [...document.querySelectorAll('tbody tr')].filter(visible).filter((tr) => tr.querySelector('a')).map((tr) => [...tr.querySelectorAll('td, th')].map((td) => norm(td.innerText))),
  tagRow: (name, tag) => {
    document.querySelectorAll('[data-sh-row="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-row'));
    const tr = [...document.querySelectorAll('tr')].filter(visible).find((x) => norm(x.querySelector('a')?.textContent) === name);
    if (tr) tr.setAttribute('data-sh-row', tag);
    return !!tr;
  },
  statTile: (label) => {
    const p = [...document.querySelectorAll('p')].filter(visible).find((x) => norm(x.textContent) === label && x.previousElementSibling?.tagName === 'P');
    return p ? norm(p.previousElementSibling.textContent) : null;
  },
  segmented: (label) => {
    const f = [...document.querySelectorAll('fieldset')].find((x) => x.getAttribute('aria-label') === label);
    return f ? [...f.querySelectorAll('button')].map((b) => ({ name: labelOf(b), pressed: b.getAttribute('aria-pressed') === 'true' })) : null;
  },
  section: (heading, tag) => {
    document.querySelectorAll('[data-sh-section="' + tag + '"]').forEach((el) => el.removeAttribute('data-sh-section'));
    const h = [...document.querySelectorAll('h2')].filter(visible).find((x) => norm(x.textContent) === heading);
    if (!h) return null;
    // Card is the only component with rounded-2xl.
    const card = h.closest('.rounded-2xl');
    if (!card) return null;
    card.setAttribute('data-sh-section', tag);
    return {
      loading: !!card.querySelector('output'),
      text: norm(card.innerText),
      items: [...card.querySelectorAll('li')].map((li) => ({ name: norm(li.querySelector('a, span.truncate')?.textContent), value: norm(li.querySelector('span.text-sm.font-bold')?.textContent), text: norm(li.innerText) })),
    };
  },
  clearDrafts: () => { localStorage.clear(); return true; },
};
`;

export type Button = { exists: boolean; disabled: boolean };
export type Card = {
  name: string;
  stock: number | null;
  left: number | null;
  total: number | null;
  limit: string;
  text: string;
  addBottle: Button;
  removeBottle: Button;
  addCase: Button;
  removeCase: Button;
};
export type Dialog = { heading: string; text: string; buttons: { name: string; disabled: boolean }[] };
export type Field = { label: string; value: string; invalid: boolean; placeholder: string | null };
export type Combobox = { text: string; disabled: boolean; expanded: boolean };
export type Article = { code: string; text: string; pdf: { description: string } | null };
export type StockRow = { name: string; units: number | null; text: string };
export type Section = { loading: boolean; text: string; items: { name: string; value: string; text: string }[] };

type Library = {
  text: () => string;
  h1: () => string;
  cards: () => Card[];
  tagCard: (name: string, tag: string) => boolean;
  buttons: (name: string) => { name: string; disabled: boolean }[];
  dialog: () => Dialog | null;
  field: (label: string) => Field | null;
  combobox: (label: string) => Combobox | null;
  options: () => string[] | null;
  articles: () => Article[];
  tagArticle: (code: string, tag: string) => boolean;
  stockRows: () => StockRow[];
  detail: (label: string) => string | null;
  accountName: () => string | null;
  tagField: (label: string, tag: string) => boolean;
  tagCombobox: (label: string, tag: string) => boolean;
  tagOption: (text: string, tag: string) => boolean;
  nameAt: (xpath: string) => string | null;
  fieldAt: (xpath: string) => string | null;
  tagFieldGroup: (label: string, tag: string) => boolean;
  valueLength: (label: string) => number;
  tagBar: () => boolean;
  hydrated: (label: string) => boolean;
  clearDrafts: () => boolean;
  headers: () => string[];
  cells: () => string[][];
  tagRow: (name: string, tag: string) => boolean;
  statTile: (label: string) => string | null;
  segmented: (label: string) => { name: string; pressed: boolean }[] | null;
  section: (heading: string, tag: string) => Section | null;
};

/** Runs one function of the library in the page and returns its JSON result. */
export async function read<K extends keyof Library>(
  page: Page,
  name: K,
  ...args: Parameters<Library[K]>
): Promise<ReturnType<Library[K]>> {
  const call = `(() => { ${LIBRARY}; return api[${JSON.stringify(name)}](...${JSON.stringify(args)}); })()`;
  return (await page.evaluate(call)) as ReturnType<Library[K]>;
}

export class TimeoutError extends Error {}

/**
 * Polls until `probe` returns a value that `ok` accepts. The failure message
 * carries the last value seen, which is what explains a red scenario.
 */
export async function waitFor<T>(
  description: string,
  probe: () => Promise<T>,
  ok: (value: T) => boolean,
  timeout = 15_000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  let last: T | undefined;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      last = await probe();
      if (ok(last)) return last;
    } catch (error) {
      // The page may be navigating: the evaluate fails until the new document exists.
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const seen = last === undefined ? String(lastError) : JSON.stringify(last).slice(0, 600);
  throw new TimeoutError(`Tiempo agotado esperando: ${description}. Último valor: ${seen}`);
}
