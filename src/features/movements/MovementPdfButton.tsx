'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, useNotify } from '@/components/ui';
import { describeError } from '@/lib/api';
import { downloadMovementPdf } from './api';

export function MovementPdfButton({ id, code }: { id: string; code: string }) {
  const t = useTranslations('movements.card');
  const tStates = useTranslations('common.states');
  const notify = useNotify();
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    setIsDownloading(true);

    try {
      await downloadMovementPdf(id, code);
    } catch (error) {
      notify('error', t('pdfFailed'), describeError(error, tStates('tryAgain')));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={() => void download()}
      isLoading={isDownloading}
      title={t('pdfTitle', { code })}
    >
      {!isDownloading && (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}
      PDF
    </Button>
  );
}
