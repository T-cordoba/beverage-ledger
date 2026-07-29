import { SecondaryButton, DestructiveButton } from '@/components/UI/Button';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelModal({ isOpen, onClose, onConfirm }: CancelModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-cardBg to-background border border-border/50 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-medium text-primary mb-3">Cancel Movement</h3>
          <p className="text-secondary/80 mb-6 leading-relaxed">
            Are you sure you want to cancel this movement? All selected items will be cleared and
            cannot be recovered.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <SecondaryButton onClick={onClose} className="flex-1">
              Keep Items
            </SecondaryButton>
            <DestructiveButton onClick={onConfirm} className="flex-1">
              Clear All
            </DestructiveButton>
          </div>
        </div>
      </div>
    </div>
  );
}
