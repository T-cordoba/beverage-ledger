'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './Dialog';

const toneStyles = {
  accent: { circle: 'bg-accent/20 text-accent', confirm: 'primary' },
  danger: { circle: 'bg-danger/20 text-danger', confirm: 'danger' },
} as const;

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone?: keyof typeof toneStyles;
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  tone = 'accent',
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isConfirming = false,
}: ConfirmDialogProps) {
  const { circle, confirm } = toneStyles[tone];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center">
        {icon && (
          <div
            className={cn(
              'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
              circle,
            )}
          >
            {icon}
          </div>
        )}
        <DialogTitle className="mb-3">{title}</DialogTitle>
        <DialogDescription className="mb-6">{description}</DialogDescription>
        <DialogFooter>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirm}
            size="lg"
            className="flex-1"
            isLoading={isConfirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
