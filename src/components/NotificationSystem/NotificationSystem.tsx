import { useCallback, useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message: string) => {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => removeNotification(id), 5000);
    },
    [removeNotification],
  );

  return {
    notifications,
    showNotification,
    removeNotification,
  };
}

const toneStyles: Record<NotificationType, { panel: string; icon: string; path: string }> = {
  success: {
    panel: 'bg-success/10 border-success/30',
    icon: 'bg-success/20 text-success',
    path: 'M5 13l4 4L19 7',
  },
  error: {
    panel: 'bg-danger/10 border-danger/30',
    icon: 'bg-danger/20 text-danger',
    path: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    panel: 'bg-warning/10 border-warning/30',
    icon: 'bg-warning/20 text-warning',
    path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  info: {
    panel: 'bg-info/10 border-info/30',
    icon: 'bg-info/20 text-info',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

interface NotificationSystemProps {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

export default function NotificationSystem({
  notifications,
  removeNotification,
}: NotificationSystemProps) {
  // The container renders even when empty: a screen reader only announces
  // changes to a live region that was already in the DOM, so returning null
  // while there is nothing to show would silence the first notification.
  return (
    <div aria-live="polite" className="fixed right-4 top-20 z-toast max-w-sm space-y-3 md:top-4">
      {notifications.map((notification) => {
        const tone = toneStyles[notification.type];

        return (
          <div
            key={notification.id}
            className={cn(
              'relative rounded-xl border p-4 shadow-overlay backdrop-blur-sm',
              'animate-in slide-in-from-right-full duration-slow',
              tone.panel,
            )}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 h-6 w-6 rounded-full"
              onClick={() => removeNotification(notification.id)}
              aria-label="Dismiss notification"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>

            <div className="flex items-start gap-3 pr-6">
              <div
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  tone.icon,
                )}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={tone.path}
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="mb-1 text-sm font-medium">{notification.title}</h4>
                <p className="text-xs leading-relaxed opacity-90">{notification.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
