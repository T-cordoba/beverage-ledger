// Ejemplo de uso del nuevo sistema de botones
// Refactorización del ConfirmModal usando los nuevos componentes

import { PrimaryButton, SecondaryButton } from '../UI/Button';

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	totalItems: number;
	totalQuantity: number;
	submitting: boolean;
}

export default function ConfirmModalRefactored({ 
	isOpen, 
	onClose, 
	onConfirm, 
	totalItems, 
	totalQuantity, 
	submitting 
}: ConfirmModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-gradient-to-br from-cardBg to-background border border-border/50 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
				<div className="text-center">
					<div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center">
						<svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 className="text-xl sm:text-2xl font-medium text-primary mb-3">Confirm Registration</h3>
					<p className="text-secondary/80 mb-6 leading-relaxed">
						Are you sure you want to register this movement with <span className="font-medium text-accent">{totalItems} liquor{totalItems !== 1 ? 's' : ''}</span> and <span className="font-medium text-accent">{totalQuantity} total item{totalQuantity !== 1 ? 's' : ''}</span>?
					</p>
					
					{/* Usando los nuevos componentes de botón */}
					<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
						<SecondaryButton
							onClick={onClose}
							disabled={submitting}
							className="flex-1"
						>
							Go Back
						</SecondaryButton>
						
						<PrimaryButton
							onClick={onConfirm}
							disabled={submitting}
							isLoading={submitting}
							className="flex-1"
						>
							{submitting ? 'Registering...' : 'Confirm'}
						</PrimaryButton>
					</div>
				</div>
			</div>
		</div>
	);
}
