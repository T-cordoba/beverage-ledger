import { PrimaryButton } from '@/components/UI/Button';

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
      className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-20 transition-all duration-700 ease-out ${
        showScrollButton
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-16 opacity-0 scale-95 pointer-events-none'
      } ${!buttonHasAppeared ? 'animate-bounce' : ''}`}
      style={{
        transform: showScrollButton ? 'translateY(0px) scale(1)' : 'translateY(64px) scale(0.95)',
        opacity: showScrollButton ? 1 : 0,
        visibility: showScrollButton ? 'visible' : 'hidden',
        animation: showScrollButton && !buttonHasAppeared ? 'bounce 1s ease-in-out 2' : 'none',
      }}
    >
      <PrimaryButton
        onClick={onScrollToCheckout}
        className={`group flex items-center gap-2 sm:gap-3 !px-3 sm:!px-4 md:!px-6 !py-2.5 sm:!py-3 md:!py-4 !bg-accent hover:!bg-accentHover !text-background !rounded-full !font-medium !transition-all !duration-300 !shadow-lg hover:!shadow-xl hover:!scale-105 active:!scale-95 !text-xs sm:!text-sm md:!text-base !border-2 !border-accent hover:!border-accentHover !backdrop-blur-sm transform hover:!-translate-y-1 active:!translate-y-0 ${
          showScrollButton && !buttonHasAppeared ? 'animate-pulse' : ''
        }`}
        aria-label="Go to checkout"
      >
        <span className="hidden sm:inline">Go to Checkout</span>
        <span className="sm:hidden">Checkout</span>
        <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-y-0.5 group-hover:scale-110 group-active:scale-90"
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
        </div>
      </PrimaryButton>
    </div>
  );
}
