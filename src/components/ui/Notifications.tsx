'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: number;
  tone: NotificationTone;
  title: string;
  message: string;
}

type Notify = (tone: NotificationTone, title: string, message: string) => void;

const NotificationsContext = createContext<Notify | null>(null);

const DISMISS_AFTER_MS = 5000;

export function useNotify(): Notify {
  const notify = useContext(NotificationsContext);

  if (!notify) {
    throw new Error('useNotify must be used inside NotificationsProvider');
  }

  return notify;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback<Notify>(
    (tone, title, message) => {
      const id = nextId.current++;
      setNotifications((current) => [...current, { id, tone, title, message }]);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationList notifications={notifications} onDismiss={dismiss} />
    </NotificationsContext.Provider>
  );
}

const toneStyles: Record<NotificationTone, { panel: string; icon: string; path: string }> = {
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

function NotificationList({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: number) => void;
}) {
  const t = useTranslations('common.actions');

  // The container renders even when empty: a screen reader only announces
  // changes to a live region that was already in the DOM, so returning null
  // while there is nothing to show would silence the first notification.
  return (
    <div aria-live="polite" className="fixed right-4 top-20 z-toast max-w-sm space-y-3 md:top-4">
      {notifications.map((notification) => {
        const tone = toneStyles[notification.tone];

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
              onClick={() => onDismiss(notification.id)}
              aria-label={t('dismiss')}
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
