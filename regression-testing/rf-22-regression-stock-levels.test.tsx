import { expect } from 'chai';
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it } from 'vitest';
import { useDescribeCases } from '@/features/stock/quantity';
import { unwrap } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import en from '@/i18n/messages/en.json';
import es from '@/i18n/messages/es.json';

const describeCasesIn = (locale: 'es' | 'en') =>
  renderHook(() => useDescribeCases(), {
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale={locale} messages={locale === 'es' ? es : en}>
        {children}
      </NextIntlClientProvider>
    ),
  }).result.current;

describe('RF-22 regression - current stock levels', () => {
  it('uses the singular for exactly one case and one bottle', () => {
    const describeCases = describeCasesIn('es');

    const phrase = describeCases(13, 12);

    expect(phrase, 'case phrase').to.equal('1 caja + 1 botella');
  });

  it('follows the active locale for both the words and the plural rules', () => {
    const describeCases = describeCasesIn('en');

    const phrase = describeCases(25, 12);

    expect(phrase, 'case phrase').to.equal('2 cases + 1 bottle');
  });

  it('groups large counts with the separator of each locale', () => {
    const inSpanish = describeCasesIn('es');
    const inEnglish = describeCasesIn('en');

    const phrases = [inSpanish(144_000, 12), inEnglish(144_000, 12)];

    expect(phrases, 'grouped phrases').to.have.ordered.members(['12.000 cajas', '12,000 cases']);
  });

  it('a validation error keeps every message the API sent, in order', () => {
    const messages = ['search must be a string', 'pageSize must not be greater than 100'];
    const failed = {
      response: new Response(null, { status: 400 }),
      error: { statusCode: 400, message: messages },
    };

    const load = () => unwrap(failed);

    expect(load, 'thrown ApiError')
      .to.throw(ApiError, messages.join('. '))
      .with.property('messages')
      .that.has.ordered.members(messages);
  });

  it('a failure without the API error shape still gives a readable message', () => {
    const failed = { response: new Response(null, { status: 502 }), error: 'Bad Gateway' };

    const load = () => unwrap(failed);

    expect(load, 'thrown ApiError')
      .to.throw(ApiError, /^Request failed with status 502$/)
      .that.includes({ status: 502, body: null });
  });
});
