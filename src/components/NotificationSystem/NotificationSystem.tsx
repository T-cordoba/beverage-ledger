import { useCallback, useState } from 'react';
import { IconButton } from '../UI/Button';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
}

export function useNotifications() {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	const showNotification = useCallback((type: NotificationType, title: string, message: string) => {
		const id = Date.now().toString();
		setNotifications(prev => [...prev, { id, type, title, message }]);
		
		// Auto remove after 5 seconds
		setTimeout(() => {
			removeNotification(id);
		}, 5000);
	}, []);

	const removeNotification = useCallback((id: string) => {
		setNotifications(prev => prev.filter(notification => notification.id !== id));
	}, []);

	return {
		notifications,
		showNotification,
		removeNotification
	};
}

interface NotificationSystemProps {
	notifications: Notification[];
	removeNotification: (id: string) => void;
}

export default function NotificationSystem({ notifications, removeNotification }: NotificationSystemProps) {
	if (notifications.length === 0) return null;

	const getNotificationIcon = (type: NotificationType) => {
		switch (type) {
			case 'success':
				return (
					<svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				);
			case 'error':
				return (
					<svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				);
			case 'warning':
				return (
					<svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
				);
			case 'info':
				return (
					<svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				);
		}
	};

	const getNotificationColor = (type: NotificationType) => {
		switch (type) {
			case 'success':
				return 'bg-green-500/10 border-green-500/30 text-green-100';
			case 'error':
				return 'bg-red-500/10 border-red-500/30 text-red-100';
			case 'warning':
				return 'bg-amber-500/10 border-amber-500/30 text-amber-100';
			case 'info':
				return 'bg-blue-500/10 border-blue-500/30 text-blue-100';
		}
	};

	const getIconBackgroundColor = (type: NotificationType) => {
		switch (type) {
			case 'success':
				return 'bg-green-500/20';
			case 'error':
				return 'bg-red-500/20';
			case 'warning':
				return 'bg-amber-500/20';
			case 'info':
				return 'bg-blue-500/20';
		}
	};

	return (
		<div className="fixed top-20 md:top-4 right-4 z-50 space-y-3 max-w-sm">
			{notifications.map((notification) => (
				<div
					key={notification.id}
					className={`relative p-4 rounded-xl shadow-2xl border backdrop-blur-sm animate-in slide-in-from-right-full duration-300 ${getNotificationColor(notification.type)}`}
				>
					<IconButton
						onClick={() => removeNotification(notification.id)}
						className="absolute top-2 right-2 w-6 h-6 hover:bg-white/10"
					>
						<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</IconButton>
					
					<div className="flex items-start gap-3 pr-6">
						<div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getIconBackgroundColor(notification.type)}`}>
							{getNotificationIcon(notification.type)}
						</div>
						
						<div className="flex-1 min-w-0">
							<h4 className="font-medium text-sm mb-1">{notification.title}</h4>
							<p className="text-xs opacity-90 leading-relaxed">{notification.message}</p>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
