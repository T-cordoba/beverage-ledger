import { ConfirmDialog } from '@/components/ui';
import { pluralize } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalItems: number;
  totalQuantity: number;
  submitting: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  totalItems,
  totalQuantity,
  submitting,
}: ConfirmModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      title="Confirm Registration"
      description={
        <>
          Are you sure you want to register this movement with{' '}
          <span className="font-medium text-accent">
            {totalItems} {pluralize(totalItems, 'liquor')}
          </span>{' '}
          and{' '}
          <span className="font-medium text-accent">
            {totalQuantity} total {pluralize(totalQuantity, 'item')}
          </span>
          ?
        </>
      }
      cancelLabel="Go Back"
      confirmLabel="Confirm"
      onConfirm={onConfirm}
      isConfirming={submitting}
    />
  );
}
