import { ConfirmDialog } from '@/components/ui';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelModal({ isOpen, onClose, onConfirm }: CancelModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      tone="danger"
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      }
      title="Cancel Movement"
      description="Are you sure you want to cancel this movement? All selected items will be cleared and cannot be recovered."
      cancelLabel="Keep Items"
      confirmLabel="Clear All"
      onConfirm={onConfirm}
    />
  );
}
