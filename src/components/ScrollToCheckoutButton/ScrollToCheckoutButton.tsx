import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ScrollToCheckoutButtonProps {
  showScrollButton: boolean;
  buttonHasAppeared: boolean;
  onScrollToCheckout: () => void;
}

export default function ScrollToCheckoutButton({
  showScrollButton,
  buttonHasAppeared,
  onScrollToCheckout,
}: ScrollToCheckoutButtonProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-floating transition-all duration-700 ease-out sm:bottom-6 sm:right-6',
        showScrollButton
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none invisible translate-y-16 scale-95 opacity-0',
        showScrollButton && !buttonHasAppeared && 'animate-bounce',
      )}
    >
      <Button
        onClick={onScrollToCheckout}
        size="lg"
        className="group rounded-full border-2 border-accent transition-transform hover:-translate-y-1 hover:scale-105 hover:border-accent-hover active:translate-y-0 active:scale-95"
        aria-label="Go to checkout"
      >
        <span className="hidden sm:inline">Go to Checkout</span>
        <span className="sm:hidden">Checkout</span>
        <svg
          className="h-4 w-4 transition-transform duration-base group-hover:translate-y-0.5 group-hover:scale-110 group-active:scale-90 sm:h-5 sm:w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </Button>
    </div>
  );
}
